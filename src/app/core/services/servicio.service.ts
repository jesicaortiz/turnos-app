import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

import { Servicio } from '../models/servicio.model';

@Injectable({
  providedIn: 'root'
})
export class ServicioService {

  private firestore = inject(Firestore);

  private readonly SERVICIOS = 'servicios';

  /**
   * Público: cualquiera puede leer la lista de servicios
   * (se usa en el formulario de reserva).
   */
  obtenerServicios$(): Observable<Servicio[]> {

    const serviciosRef = collection(this.firestore, this.SERVICIOS);

    return collectionData(serviciosRef, { idField: 'id' }) as Observable<Servicio[]>;

  }

  async crearServicio(servicio: Omit<Servicio, 'id'>): Promise<void> {

    const serviciosRef = collection(this.firestore, this.SERVICIOS);

    await addDoc(serviciosRef, servicio);

  }

  async actualizarServicio(
    id: string,
    cambios: Partial<Omit<Servicio, 'id'>>
  ): Promise<void> {

    const servicioDoc = doc(this.firestore, this.SERVICIOS, id);

    await updateDoc(servicioDoc, cambios);

  }

  async eliminarServicio(id: string): Promise<void> {

    const servicioDoc = doc(this.firestore, this.SERVICIOS, id);

    await deleteDoc(servicioDoc);

  }

}