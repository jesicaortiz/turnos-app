export type EstadoTurno =
  | 'pendiente'
  | 'confirmado'
  | 'cancelado';

export interface Turno {

  id: string;

  nombre: string;

  telefono: string;

  servicio: string;

  fecha: string;

  hora: string;

  estado: EstadoTurno;

  creadoEn: string;

}
