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
    MatChipsModule
  ],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css'
})
export class HistorialComponent {

  private turnoService = inject(TurnoService);
  private horarioService = inject(HorarioService);

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

}