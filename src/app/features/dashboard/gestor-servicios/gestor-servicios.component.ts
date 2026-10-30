import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import { ServicioService } from '../../../core/services/servicio.service';
import { Servicio } from '../../../core/models/servicio.model';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';

@Component({
  selector: 'app-gestor-servicios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './gestor-servicios.component.html',
  styleUrl: './gestor-servicios.component.css'
})
export class GestorServiciosComponent {

  private servicioService = inject(ServicioService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  servicios$ = this.servicioService.obtenerServicios$();

  servicioForm: FormGroup = this.fb.group({

    nombre: [
      '',
      [
        Validators.required,
        Validators.minLength(2)
      ]
    ],

    duracionMinutos: [
      30,
      [
        Validators.required,
        Validators.min(5)
      ]
    ],

    precio: [
      0,
      [
        Validators.required,
        Validators.min(0)
      ]
    ]

  });

  /**
   * Si no es null, el formulario está editando
   * ese servicio en vez de crear uno nuevo.
   */
  editandoId: string | null = null;

  async guardar(): Promise<void> {

    if (this.servicioForm.invalid) {

      this.servicioForm.markAllAsTouched();

      return;

    }

    const datos = this.servicioForm.value;

    try {

      if (this.editandoId) {

        await this.servicioService.actualizarServicio(
          this.editandoId,
          datos
        );

        this.mostrarMensaje('Servicio actualizado');

      } else {

        await this.servicioService.crearServicio(datos);

        this.mostrarMensaje('Servicio creado');

      }

      this.cancelarEdicion();

    } catch (err: unknown) {

      console.error('Error al guardar el servicio:', err);

      this.mostrarMensaje(
        'Ocurrió un error al guardar',
        'error-snackbar'
      );

    }

  }

  editar(servicio: Servicio): void {

    this.editandoId = servicio.id;

    this.servicioForm.setValue({
      nombre: servicio.nombre,
      duracionMinutos: servicio.duracionMinutos,
      precio: servicio.precio
    });

  }

  cancelarEdicion(): void {

    this.editandoId = null;

    this.servicioForm.reset({
      nombre: '',
      duracionMinutos: 30,
      precio: 0
    });

  }

  async eliminar(servicio: Servicio): Promise<void> {

    const confirmado = confirm(
      `¿Eliminar el servicio "${servicio.nombre}"?`
    );

    if (!confirmado) {
      return;
    }

    try {

      await this.servicioService.eliminarServicio(servicio.id);

      this.mostrarMensaje('Servicio eliminado');

      if (this.editandoId === servicio.id) {
        this.cancelarEdicion();
      }

    } catch (err: unknown) {

      console.error('Error al eliminar el servicio:', err);

      this.mostrarMensaje(
        'Ocurrió un error al eliminar',
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