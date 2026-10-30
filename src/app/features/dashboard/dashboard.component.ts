import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TurnoService } from '../../core/services/turno.service';
import { Turno } from '../../core/models/turno.model';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';
import { GestorServiciosComponent } from './gestor-servicios/gestor-servicios.component';
import { GestorHorariosComponent } from './gestor-horarios/gestor-horarios.component';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule,
    GestorServiciosComponent,
    GestorHorariosComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {

  private turnoService = inject(TurnoService);
  private snackBar = inject(MatSnackBar);

  turnos$ = this.turnoService.obtenerTurnos$();

  async confirmar(turno: Turno): Promise<void> {

    await this.cambiarEstado(turno, 'confirmado');

  }

  async cancelar(turno: Turno): Promise<void> {

    await this.cambiarEstado(turno, 'cancelado');

  }

  async eliminar(turno: Turno): Promise<void> {

    const confirmado = confirm(
      `¿Eliminar el turno de ${turno.nombre} (${turno.fecha} ${turno.hora})?`
    );

    if (!confirmado) {
      return;
    }

    try {

      await this.turnoService.eliminarTurno(
        turno.id,
        turno.fecha,
        turno.hora
      );

      this.mostrarMensaje('Turno eliminado');

    } catch (err: unknown) {

      console.error('Error al eliminar el turno:', err);

      this.mostrarMensaje(
        'Ocurrió un error al eliminar',
        'error-snackbar'
      );

    }

  }

  private async cambiarEstado(
    turno: Turno,
    estado: Turno['estado']
  ): Promise<void> {

    try {

      await this.turnoService.actualizarEstado(turno.id, estado);

      this.mostrarMensaje(`Turno ${estado}`);

    } catch (err: unknown) {

      console.error('Error al actualizar el turno:', err);

      this.mostrarMensaje(
        'Ocurrió un error al actualizar',
        'error-snackbar'
      );

    }

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