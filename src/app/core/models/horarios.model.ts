export interface DiaAtencion {

  activo: boolean;

  /** Formato HH:mm */
  desde: string;

  /** Formato HH:mm */
  hasta: string;

  /** Pausa opcional (ej. mediodía). Vacío = sin pausa. */
  pausaDesde: string;

  pausaHasta: string;

}

export interface ConfigHorarios {

  duracionTurnoMinutos: number;

  /**
   * 7 posiciones, igual que Date.getDay():
   * 0 = domingo, 1 = lunes ... 6 = sábado.
   */
  dias: DiaAtencion[];

  /** Días puntuales cerrados, formato YYYY-MM-DD. */
  diasCerrados: string[];

}

const DIA_HABIL: DiaAtencion = {
  activo: true,
  desde: '09:00',
  hasta: '18:00',
  pausaDesde: '13:00',
  pausaHasta: '14:00'
};

const DIA_CERRADO: DiaAtencion = {
  activo: false,
  desde: '09:00',
  hasta: '18:00',
  pausaDesde: '',
  pausaHasta: ''
};

/**
 * Equivale al comportamiento anterior (hardcodeado):
 * lunes a sábado, turnos de 1 hora de 09:00 a 18:00
 * con pausa de 13:00 a 14:00, domingos cerrado.
 */
export const CONFIG_HORARIOS_DEFAULT: ConfigHorarios = {

  duracionTurnoMinutos: 60,

  dias: [
    { ...DIA_CERRADO },
    { ...DIA_HABIL },
    { ...DIA_HABIL },
    { ...DIA_HABIL },
    { ...DIA_HABIL },
    { ...DIA_HABIL },
    { ...DIA_HABIL }
  ],

  diasCerrados: []

};