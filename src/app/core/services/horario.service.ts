import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  docData,
  setDoc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  ConfigHorarios,
  CONFIG_HORARIOS_DEFAULT
} from '../models/horarios.model';

@Injectable({
  providedIn: 'root'
})
export class HorarioService {

  private firestore = inject(Firestore);

  private configDoc = doc(
    this.firestore,
    'configuracion',
    'horarios'
  );

  /**
   * Público: el formulario de reserva lo necesita.
   * Si el dueño todavía no configuró nada, devuelve
   * la configuración por defecto.
   */
  obtenerConfig$(): Observable<ConfigHorarios> {

    return (docData(this.configDoc) as Observable<ConfigHorarios | undefined>)
      .pipe(
        map(config => ({
          ...CONFIG_HORARIOS_DEFAULT,
          ...config
        }))
      );

  }

  async guardarConfig(config: ConfigHorarios): Promise<void> {

    await setDoc(this.configDoc, config);

  }

  /**
   * Indica si el local atiende en esa fecha
   * (día de la semana activo y no marcado como cerrado).
   */
  esDiaAtendible(
    config: ConfigHorarios,
    fecha: Date
  ): boolean {

    const dia = config.dias[fecha.getDay()];

    if (!dia?.activo) {
      return false;
    }

    return !config.diasCerrados.includes(
      this.formatearFecha(fecha)
    );

  }

  /**
   * Genera los horarios de inicio de turno para una fecha,
   * según la configuración (horario, pausa y duración).
   */
  generarHoras(
    config: ConfigHorarios,
    fecha: Date
  ): string[] {

    if (!this.esDiaAtendible(config, fecha)) {
      return [];
    }

    const dia = config.dias[fecha.getDay()];

    const paso = config.duracionTurnoMinutos;

    if (!paso || paso <= 0) {
      return [];
    }

    const inicio = this.aMinutos(dia.desde);
    const fin = this.aMinutos(dia.hasta);

    const pausaInicio = dia.pausaDesde
      ? this.aMinutos(dia.pausaDesde)
      : null;

    const pausaFin = dia.pausaHasta
      ? this.aMinutos(dia.pausaHasta)
      : null;

    const horas: string[] = [];

    for (let t = inicio; t + paso <= fin; t += paso) {

      const tFin = t + paso;

      const seSuperponeConPausa =
        pausaInicio !== null &&
        pausaFin !== null &&
        t < pausaFin &&
        tFin > pausaInicio;

      if (!seSuperponeConPausa) {
        horas.push(this.aTexto(t));
      }

    }

    return horas;

  }

  /**
   * Convierte una fecha a YYYY-MM-DD.
   */
  formatearFecha(fecha: Date): string {

    const año = fecha.getFullYear();

    const mes = String(fecha.getMonth() + 1)
      .padStart(2, '0');

    const dia = String(fecha.getDate())
      .padStart(2, '0');

    return `${año}-${mes}-${dia}`;

  }

  private aMinutos(hora: string): number {

    const [h, m] = hora.split(':').map(Number);

    return h * 60 + m;

  }

  private aTexto(minutos: number): string {

    const h = String(Math.floor(minutos / 60))
      .padStart(2, '0');

    const m = String(minutos % 60)
      .padStart(2, '0');

    return `${h}:${m}`;

  }

}