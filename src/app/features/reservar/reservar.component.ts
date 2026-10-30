import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import { TurnoService } from '../../core/services/turno.service';
import { ServicioService } from '../../core/services/servicio.service';
import { HorarioService } from '../../core/services/horario.service';
import { Turno } from '../../core/models/turno.model';
import {
  ConfigHorarios,
  CONFIG_HORARIOS_DEFAULT
} from '../../core/models/horarios.model';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';

@Component({
  selector: 'app-reservar',
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
    MatCardModule,
    MatSnackBarModule
  ],
  templateUrl: './reservar.component.html',
  styleUrl: './reservar.component.css'
})
export class ReservarComponent {

  private servicioService = inject(ServicioService);
  private horarioService = inject(HorarioService);

  turnoForm: FormGroup;

  servicios$ = this.servicioService.obtenerServicios$();

  /**
   * Configuración de horarios del local. Arranca con los
   * valores por defecto y se actualiza en cuanto llega
   * la configuración real desde Firestore.
   */
  config: ConfigHorarios = CONFIG_HORARIOS_DEFAULT;

  horasLibres: string[] = [];

  constructor(
    private fb: FormBuilder,
    private turnoService: TurnoService,
    private snackBar: MatSnackBar
  ) {

    this.turnoForm = this.fb.group({

      nombre: [
        '',
       [
    Validators.required,
    Validators.minLength(3),
    Validators.maxLength(80)
        ]
      ],

      telefono: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9]{8,15}$/)
        ]
      ],

      servicio: [
        '',
        Validators.required
      ],

      fecha: [
        '',
        Validators.required
      ],

      hora: [
        '',
        Validators.required
      ]

    });

    // Si el dueño cambia los horarios mientras alguien tiene
    // el formulario abierto, recalculamos las horas libres.
    this.horarioService
      .obtenerConfig$()
      .pipe(takeUntilDestroyed())
      .subscribe(config => {

        this.config = config;

        const fecha = this.turnoForm.get('fecha')?.value;

        if (fecha) {

          this.actualizarHorasDisponibles(fecha)
            .catch(err =>
              console.error(
                'Error al actualizar horas disponibles:',
                err
              )
            );

        }

      });

    this.turnoForm
      .get('fecha')
      ?.valueChanges
      .subscribe(fecha => {

        if (fecha) {
          // El callback de subscribe no puede ser async,
          // por eso llamamos a la función async sin await
          // y manejamos el error con .catch()
          this.actualizarHorasDisponibles(fecha)
            .catch(err =>
              console.error(
                'Error al actualizar horas disponibles:',
                err
              )
            );
        } else {
          this.horasLibres = [];
        }

        this.turnoForm
          .get('hora')
          ?.reset();

      });

  }

  /**
   * Determina si una fecha puede ser seleccionada:
   * no puede ser pasada y el local tiene que atender
   * ese día de la semana (y no estar marcado como cerrado).
   */
  fechaPermitida = (fecha: Date | null): boolean => {

    if (!fecha) {
      return false;
    }

    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    const fechaSeleccionada = new Date(fecha);

    fechaSeleccionada.setHours(0, 0, 0, 0);

    const esFechaPasada =
      fechaSeleccionada < hoy;

    return (
      !esFechaPasada &&
      this.horarioService.esDiaAtendible(
        this.config,
        fechaSeleccionada
      )
    );

  };

  /**
   * Actualiza las horas disponibles según la fecha
   * seleccionada: horarios configurados menos los ocupados.
   */
  private async actualizarHorasDisponibles(
    fecha: Date
  ): Promise<void> {

    const fechaTexto =
      this.horarioService.formatearFecha(fecha);

    const todas =
      this.horarioService.generarHoras(
        this.config,
        fecha
      );

    const ocupadas =
      await this.turnoService.obtenerHorasOcupadas(
        fechaTexto
      );

    this.horasLibres =
      todas.filter(
        hora => !ocupadas.includes(hora)
      );

  }

  /**
   * Realiza la reserva.
   */
  async reservar(): Promise<void> {

    if (this.turnoForm.invalid) {

      this.turnoForm.markAllAsTouched();

      this.mostrarMensaje(
        'Completá todos los campos correctamente',
        'Cerrar',
        'error-snackbar'
      );

      return;
    }

    const fechaSeleccionada:
      Date = this.turnoForm.value.fecha;

    const fecha =
      this.horarioService.formatearFecha(fechaSeleccionada);

    const hora =
      this.turnoForm.value.hora;

    const turno: Omit<Turno, 'id'> = {

      nombre:
        this.turnoForm.value.nombre,

      telefono:
        this.turnoForm.value.telefono,

      servicio:
        this.turnoForm.value.servicio,

      fecha,

      hora,

      estado: 'pendiente',

      creadoEn:
        new Date().toISOString()

    };

    try {

      await this.turnoService.guardarTurno(
        turno
      );

      this.mostrarMensaje(
        'Turno reservado correctamente'
      );

      this.turnoForm.reset();

      this.horasLibres = [];

    } catch (err: unknown) {

      console.error('Error al guardar el turno:', err);

      const horaOcupada =
        err instanceof Error && err.message === 'HORA_OCUPADA';

      this.mostrarMensaje(
        horaOcupada
          ? 'Ese horario acaba de ser reservado. Elegí otro.'
          : 'Ocurrió un error al reservar. Intentá de nuevo.',
        'Cerrar',
        'error-snackbar'
      );

      if (horaOcupada) {

        await this.actualizarHorasDisponibles(
          fechaSeleccionada
        );

        this.turnoForm
          .get('hora')
          ?.reset();

      }

    }

  }

  /**
   * Muestra mensajes al usuario.
   */
  private mostrarMensaje(
    mensaje: string,
    accion = 'Cerrar',
    panelClass = 'success-snackbar'
  ): void {

    this.snackBar.open(
      mensaje,
      accion,
      {
        duration: 3500,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass
      }
    );

  }

}