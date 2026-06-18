export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'cajera' | 'estesista' | 'enfermera' | 'encargada_farmacia';
  puede_caja?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Patient {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string;
}

export interface Procedure {
  id: string;
  paciente_id: string;
  tratamiento_id: string;
  fecha: string;
  notas: string;
  fotos: string[];
}

export interface Transaction {
  id: string;
  monto: number;
  tipo: string;
  fecha: string;
  usuario_id: string;
}
