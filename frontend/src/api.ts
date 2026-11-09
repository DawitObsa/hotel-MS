const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
let token = sessionStorage.getItem('hospital-token');

export function setToken(value: string | null) {
  token = value;
  if (value) sessionStorage.setItem('hospital-token', value);
  else sessionStorage.removeItem('hospital-token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body as T;
}

export type User = { id: string; name: string; email: string; role: 'admin' | 'doctor' | 'nurse' | 'receptionist' };
export type Patient = { _id: string; patientNumber: string; firstName: string; lastName: string; dateOfBirth: string; sex: string; phone: string; email: string; bloodType: string; allergies: string };
export type Appointment = { _id: string; patient: Patient; clinician: string; department: string; startsAt: string; reason: string; status: string };
export type Vital = { _id: string; patient: string; recordedAt: string; systolic: number; diastolic: number; pulse: number; temperatureC: number; respiratoryRate: number; oxygenSaturation: number; weightKg?: number; heightCm?: number; painScore?: number; notes: string; recordedBy: { name: string; role: string } };
export type Staff = { id?: string; _id?: string; name: string; email: string; role: User['role']; createdAt?: string };
