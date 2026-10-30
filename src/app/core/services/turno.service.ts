import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  updateDoc,
  doc,
  docData,
  runTransaction
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