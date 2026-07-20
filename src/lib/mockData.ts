import { User, AttendanceRecord, KPIEvaluation } from './types';

export const mockUsers: User[] = [
  { id: '1', name: 'Bapak Kepala Sekolah', role: 'admin', email: 'admin@sekolah.id', password: 'password123' },
  { id: '2', name: 'Budi Santoso', role: 'staff', position: 'Guru Matematika', jobRoles: ['Guru Mapel', 'Walikelas'], email: 'budi@sekolah.id', password: 'password123' },
  { id: '3', name: 'Siti Aminah', role: 'staff', position: 'Guru Bahasa Inggris', jobRoles: ['Guru Mapel', 'Guru BK'], email: 'siti@sekolah.id', password: 'password123' },
  { id: '4', name: 'Joko Widodo', role: 'staff', position: 'Staff TU', jobRoles: ['TU', 'Kebersihan'], email: 'joko@sekolah.id', password: 'password123' },
];

export const initialAttendance: AttendanceRecord[] = [
  {
    id: 'a1',
    userId: '2',
    date: new Date().toISOString().split('T')[0],
    checkIn: new Date(new Date().setHours(7, 15, 0, 0)).toISOString(),
    status: 'present'
  },
  {
    id: 'a2',
    userId: '3',
    date: new Date().toISOString().split('T')[0],
    status: 'leave',
    note: 'Menjenguk keluarga sakit'
  }
];

export const initialKPIs: KPIEvaluation[] = [
  {
    id: 'k1',
    userId: '2',
    evaluatorId: '1',
    month: '2026-06',
    taskScores: [
      { task: 'Membuat dan mengunggah Modul Ajar/RPP', score: 5 },
      { task: 'Menyusun struktur organisasi kelas', score: 4 },
      { task: 'Piket harian', score: 3 }
    ],
    notes: 'Kinerja sangat baik, terus pertahankan penyusunan modul.',
    createdAt: new Date().toISOString()
  }
];
