import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  ReactiveFormsModule,
  FormBuilder,
  FormArray,
  FormControl,
  Validators
} from '@angular/forms';

import { firstValueFrom } from 'rxjs';

import { HorarioService } from '../../../core/services/horario.service';
import {
  ConfigHorarios,
  DiaAtencion,
  CONFIG_HORARIOS_DEFAULT
} from '../../../core/models/horarios.model';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';

@Component({
  selector: 'app-gestor-horarios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  templateUrl: './gestor-horarios.component.html',
  styleUrl: './gestor-horarios.component.css'
})
export class GestorHorariosComponent implements OnInit {

  private horarioService = inject(HorarioService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  /** Índices de Date.getDay() en el orden en que se muestran (lunes primero). */
  readonly ordenDias = [1, 2, 3, 4, 5, 6, 0];

  readonly nombresDias = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado'
  ];

  form = this.fb.group({

    duracionTurnoMinutos: [
      CONFIG_HORARIOS_DEFAULT.duracionTurnoMinutos,
      [
        Validators.required,
        Validators.min(10)
      ]
    ],

    dias: this.fb.array(
      CONFIG_HORARIOS_DEFAULT.dias.map(dia =>
        this.crearGrupoDia(dia)
      )
    )

  });

  diasCerrados: string[] = [];

  nuevoCierre = new FormControl<Date | null>(null);

  cargando = true;

  get diasArray(): FormArray {

    return this.form.get('dias') as FormArray;

  }

  async ngOnInit(): Promise<void> {

    try {

      const config = await firstValueFrom(
        this.horarioService.obtenerConfig$()
      );

      this.form.patchValue({
        duracionTurnoMinutos: config.duracionTurnoMinutos,
        dias: config.dias
      });

      this.diasCerrados = [...config.diasCerrados];

    } catch (err: unknown) {

      console.error('Error al cargar los horarios:', err);

      this.mostrarMensaje(
        'No se pudieron cargar los horarios',
        'error-snackbar'
      );

    } finally {

      this.cargando = false;

    }

  }

  agregarCierre(): void {

    const fecha = this.nuevoCierre.value;

    if (!fecha) {
      return;
    }

    const texto = this.horarioService.formatearFecha(fecha);

    if (!this.diasCerrados.includes(texto)) {

      this.diasCerrados = [
        ...this.diasCerrados,
        texto
      ].sort();

    }

    this.nuevoCierre.reset();

  }

  quitarCierre(fecha: string): void {

    this.diasCerrados = this.diasCerrados.filter(
      f => f !== fecha
    );

  }

  async guardar(): Promise<void> {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;

    }

    const dias = this.diasArray.getRawValue() as DiaAtencion[];

    for (const indice of this.ordenDias) {

      const dia = dias[indice];

      if (!dia.activo) {
        continue;
      }

      const nombre = this.nombresDias[indice];

      if (!dia.desde || !dia.hasta || dia.desde >= dia.hasta) {

        this.mostrarMensaje(
          `${nombre}: el horario de cierre debe ser posterior al de apertura`,
          'error-snackbar'
        );

        return;

      }

      const tienePausaDesde = !!dia.pausaDesde;
      const tienePausaHasta = !!dia.pausaHasta;

      if (tienePausaDesde !== tienePausaHasta) {

        this.mostrarMensaje(
          `${nombre}: completá ambos horarios de la pausa o dejá los dos vacíos`,
          'error-snackbar'
        );

        return;

      }

      if (
        tienePausaDesde &&
        dia.pausaDesde >= dia.pausaHasta
      ) {

        this.mostrarMensaje(
          `${nombre}: el fin de la pausa debe ser posterior a su inicio`,
          'error-snackbar'
        );

        return;

      }

    }

    const config: ConfigHorarios = {

      duracionTurnoMinutos:
        Number(this.form.value.duracionTurnoMinutos),

      dias,

      diasCerrados: this.diasCerrados

    };

    try {

      await this.horarioService.guardarConfig(config);

      this.mostrarMensaje('Horarios guardados');

    } catch (err: unknown) {

      console.error('Error al guardar los horarios:', err);

      this.mostrarMensaje(
        'Ocurrió un error al guardar',
        'error-snackbar'
      );

    }

  }

  private crearGrupoDia(dia: DiaAtencion) {

    return this.fb.group({
      activo: [dia.activo],
      desde: [dia.desde],
      hasta: [dia.hasta],
      pausaDesde: [dia.pausaDesde],
      pausaHasta: [dia.pausaHasta]
    });

  }

  private mostrarMensaje(
    mensaje: string,
    panelClass = 'success-snackbar'
  ): void {

    this.snackBar.open(
      mensaje,
      'Cerrar',
      {
        duration: 3500,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass
      }
    );

  }

}