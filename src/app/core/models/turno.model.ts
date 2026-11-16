export type EstadoTurno =
  | 'pendiente'
  | 'confirmado'
  | 'cancelado'
  | 'completado';

export interface Turno {

  id: string;

  nombre: string;

  telefono: string;

  servicio: string;

  fecha: string;

  hora: string;

  estado: EstadoTurno;

  creadoEn: string;

  /** Precio del servicio al momento de la atención (solo en turnos completados). */
  precio?: number;

  /** Momento en que se marcó como atendido (ISO). */
  completadoEn?: string;

}
