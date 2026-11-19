import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  deleteField,
  updateDoc,
  doc,
  docData,
  runTransaction,
  writeBatch
} from '@angular/fire/firestore';
import { Observable, firstValueFrom } from 'rxjs';

import { Turno } from '../models/turno.model';

interface Disponibilidad {
  horasOcupadas: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TurnoService {

  private firestore = inject(Firestore);

  private readonly TURNOS = 'turnos';
  private readonly DISPONIBILIDAD = 'disponibilidad';

  /**
   * Solo accesible para el dueño autenticado
   * (protegido por las reglas de Firestore).
   */
  obtenerTurnos$(): Observable<Turno[]> {

    const turnosRef = collection(this.firestore, this.TURNOS);

    return collectionData(turnosRef, { idField: 'id' }) as Observable<Turno[]>;

  }

  async actualizarEstado(
    id: string,
    estado: Turno['estado']
  ): Promise<void> {

    const turnoDoc = doc(this.firestore, this.TURNOS, id);

    await updateDoc(turnoDoc, { estado });

  }

  /**
   * Marca el turno como atendido y guarda el precio del
   * servicio de ese momento, para que el historial no cambie
   * si más adelante se modifican los precios.
   */
  async completarTurno(
    id: string,
    precio: number
  ): Promise<void> {

    const turnoDoc = doc(this.firestore, this.TURNOS, id);

    await updateDoc(turnoDoc, {
      estado: 'completado',
      precio,
      completadoEn: new Date().toISOString()
    });

  }

  /**
   * Revierte un "atendido" hecho por error.
   */
  async deshacerCompletado(
    id: string,
    estadoAnterior: Turno['estado']
  ): Promise<void> {

    const turnoDoc = doc(this.firestore, this.TURNOS, id);

    await updateDoc(turnoDoc, {
      estado: estadoAnterior,
      precio: deleteField(),
      completadoEn: deleteField()
    });

  }

  async eliminarTurno(
    id: string,
    fecha: string,
    hora: string
  ): Promise<void> {

    const turnoDoc = doc(this.firestore, this.TURNOS, id);
    const dispoDoc = doc(this.firestore, this.DISPONIBILIDAD, fecha);

    await runTransaction(this.firestore, async transaccion => {

      const dispoSnap = await transaccion.get(dispoDoc);

      transaccion.delete(turnoDoc);

      if (dispoSnap.exists()) {

        const data = dispoSnap.data() as Disponibilidad;

        const nuevasHoras = data.horasOcupadas.filter(
          h => h !== hora
        );

        transaccion.update(dispoDoc, { horasOcupadas: nuevasHoras });

      }

    });

  }

  /**
   * Elimina un registro del historial.
   *
   * - Atendido: solo se borra el registro (el horario ya pasó).
   * - Cancelado: además se libera el horario, que seguía ocupado.
   */
  async eliminarRegistro(turno: Turno): Promise<void> {

    if (turno.estado === 'completado') {

      await deleteDoc(
        doc(this.firestore, this.TURNOS, turno.id)
      );

      return;

    }

    await this.eliminarTurno(
      turno.id,
      turno.fecha,
      turno.hora
    );

  }

  /**
   * Elimina varias atenciones ya realizadas de una vez.
   * Firestore permite hasta 500 operaciones por lote,
   * por eso se divide en tandas.
   */
  async eliminarAtendidos(ids: string[]): Promise<void> {

    const TAMANO_LOTE = 400;

    for (let i = 0; i < ids.length; i += TAMANO_LOTE) {

      const lote = writeBatch(this.firestore);

      ids
        .slice(i, i + TAMANO_LOTE)
        .forEach(id =>
          lote.delete(doc(this.firestore, this.TURNOS, id))
        );

      await lote.commit();

    }

  }

  /**
   * Público: solo expone qué horas están ocupadas
   * para una fecha, sin datos personales.
   */
  async obtenerHorasOcupadas(fecha: string): Promise<string[]> {

    const dispoDoc = doc(this.firestore, this.DISPONIBILIDAD, fecha);

    const dispoData = await firstValueFrom(
      docData(dispoDoc) as Observable<Disponibilidad | undefined>
    );

    return dispoData?.horasOcupadas ?? [];

  }

  /**
   * Crea el turno y reserva la hora en disponibilidad
   * de forma atómica.
   *
   * El ID del turno es fecha_hora (ej. 2026-10-08_14:00),
   * así solo puede existir un turno por horario.
   */
  async guardarTurno(turno: Omit<Turno, 'id'>): Promise<void> {

    const dispoDoc = doc(this.firestore, this.DISPONIBILIDAD, turno.fecha);

    const turnoDoc = doc(
      this.firestore,
      this.TURNOS,
      `${turno.fecha}_${turno.hora}`
    );

    await runTransaction(this.firestore, async transaccion => {

      const dispoSnap = await transaccion.get(dispoDoc);

      const horasOcupadas: string[] = dispoSnap.exists()
        ? (dispoSnap.data() as Disponibilidad).horasOcupadas
        : [];

      if (horasOcupadas.includes(turno.hora)) {

        throw new Error('HORA_OCUPADA');

      }

      transaccion.set(turnoDoc, turno);

      if (dispoSnap.exists()) {

        // La hora nueva tiene que ir al final: las reglas lo verifican así.
        transaccion.update(dispoDoc, {
          horasOcupadas: [...horasOcupadas, turno.hora]
        });

      } else {

        transaccion.set(dispoDoc, {
          horasOcupadas: [turno.hora]
        });

      }

    });

  }

}