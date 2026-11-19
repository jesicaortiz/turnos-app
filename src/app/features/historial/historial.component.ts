import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  ReactiveFormsModule,
  FormControl,
  FormGroup
} from '@angular/forms';

import { combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { TurnoService } from '../../core/services/turno.service';
import { HorarioService } from '../../core/services/horario.service';
import { Turno } from '../../core/models/turno.model';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';

type FiltroEstado = 'completado' | 'cancelado' | 'todos';

interface Filtros {
  busqueda: string;
  servicio: string;
  estado: FiltroEstado;
  desde: Date | null;
  hasta: Date | null;
}

interface VistaHistorial {
  items: Turno[];
  servicios: string[];
  cantidadAtendidos: number;
  total: number;
}

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css'
})
export class HistorialComponent {

  private turnoService = inject(TurnoService);
  private horarioService = inject(HorarioService);
  private snackBar = inject(MatSnackBar);

  filtrosForm = new FormGroup({

    busqueda: new FormControl('', { nonNullable: true }),

    servicio: new FormControl('', { nonNullable: true }),

    estado: new FormControl<FiltroEstado>('completado', { nonNullable: true }),

    desde: new FormControl<Date | null>(null),

    hasta: new FormControl<Date | null>(null)

  });

  /**
   * Combina los turnos de Firestore (en tiempo real)
   * con los filtros elegidos.
   */
  vista$ = combineLatest([
    this.turnoService.obtenerTurnos$(),
    this.filtrosForm.valueChanges.pipe(startWith(null))
  ]).pipe(
    map(([turnos]) =>
      this.armarVista(turnos, this.filtrosForm.getRawValue())
    )
  );

  limpiarFiltros(): void {

    this.filtrosForm.reset();

  }

  /** Solo se pueden borrar registros ya cerrados (atendidos o cancelados). */
  puedeEliminarse(turno: Turno): boolean {

    return turno.estado === 'completado' || turno.estado === 'cancelado';

  }

  async eliminar(turno: Turno): Promise<void> {

    const confirmado = confirm(
      `¿Eliminar el registro de ${turno.nombre} ` +
      `(${this.verFecha(turno.fecha)} ${turno.hora})? ` +
      'Esta acción no se puede deshacer.'
    );

    if (!confirmado) {
      return;
    }

    try {

      await this.turnoService.eliminarRegistro(turno);

      this.mostrarMensaje('Registro eliminado');

    } catch (err: unknown) {

      console.error('Error al eliminar el registro:', err);

      this.mostrarMensaje(
        'Ocurrió un error al eliminar',
        'error-snackbar'
      );

    }

  }

  /**
   * Elimina todas las atenciones que se están viendo en la lista
   * (respetando los filtros). Los cancelados, pendientes y
   * confirmados no se tocan.
   */
  async eliminarAtendidos(items: Turno[]): Promise<void> {

    const ids = items
      .filter(turno => turno.estado === 'completado')
      .map(turno => turno.id);

    if (ids.length === 0) {
      return;
    }

    const cantidad = ids.length === 1
      ? '1 atención'
      : `${ids.length} atenciones`;

    const confirmado = confirm(
      `¿Eliminar definitivamente ${cantidad} del historial? ` +
      'Esta acción no se puede deshacer.'
    );

    if (!confirmado) {
      return;
    }

    try {

      await this.turnoService.eliminarAtendidos(ids);

      this.mostrarMensaje(`Se eliminaron ${cantidad}`);

    } catch (err: unknown) {

      console.error('Error al eliminar las atenciones:', err);

      this.mostrarMensaje(
        'Ocurrió un error al eliminar',
        'error-snackbar'
      );

    }

  }

  /** 2026-10-08 -> 08/10/2026 (sin pasar por Date, para evitar desfases de zona horaria). */
  verFecha(fecha: string): string {

    const [anio, mes, dia] = fecha.split('-');

    return `${dia}/${mes}/${anio}`;

  }

  etiquetaEstado(estado: Turno['estado']): string {

    return estado === 'completado' ? 'atendido' : estado;

  }

  private armarVista(
    turnos: Turno[],
    filtros: Filtros
  ): VistaHistorial {

    const texto = filtros.busqueda.trim().toLowerCase();

    const desde = filtros.desde
      ? this.horarioService.formatearFecha(filtros.desde)
      : null;

    const hasta = filtros.hasta
      ? this.horarioService.formatearFecha(filtros.hasta)
      : null;

    const items = turnos
      .filter(t =>
        filtros.estado === 'todos' || t.estado === filtros.estado
      )
      .filter(t =>
        !filtros.servicio || t.servicio === filtros.servicio
      )
      .filter(t =>
        !texto ||
        t.nombre.toLowerCase().includes(texto) ||
        t.telefono.includes(texto)
      )
      .filter(t => !desde || t.fecha >= desde)
      .filter(t => !hasta || t.fecha <= hasta)
      .sort((a, b) =>
        (b.fecha + b.hora).localeCompare(a.fecha + a.hora)
      );

    const atendidos = items.filter(t => t.estado === 'completado');

    const servicios = Array.from(
      new Set(turnos.map(t => t.servicio))
    ).sort((a, b) => a.localeCompare(b));

    return {

      items,

      servicios,

      cantidadAtendidos: atendidos.length,

      total: atendidos.reduce(
        (suma, t) => suma + (t.precio ?? 0),
        0
      )

    };

  }

  private mostrarMensaje(
    mensaje: string,
    panelClass = 'success-snackbar'
  ): void {

    this.snackBar.open(
      mensaje,
      'Cerrar',
      {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass
      }
    );

  }

}