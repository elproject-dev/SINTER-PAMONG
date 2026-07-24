export type Role = 'admin' | 'staff';

export interface User {
  id: string;
  name: string;
  role: Role;
  position?: string; // e.g. "Guru Matematika", "Staff TU"
  jobRoles?: string[];
  isApproved?: boolean;
  email?: string;
  phone?: string;
  password?: string;
}

export interface MasterJabatan {
  id: string;
  nama_jabatan: string;
}

export type AttendanceStatus = 'present' | 'leave' | 'sick' | 'absent';

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // ISO String
  checkOut?: string; // ISO String
  status: AttendanceStatus;
  note?: string; // For leave/sick reasons
  latitude?: number;
  longitude?: number;
  selfieUrl?: string; // URL foto selfie absensi
}

export interface KPITaskScore {
  task: string;
  score: number; // 1-5
  category?: string;
}

export interface KPIEvaluation {
  id: string;
  userId: string;
  evaluatorId: string;
  month: string; // YYYY-MM
  taskScores: KPITaskScore[];
  notes: string;
  createdAt: string;
}

export type ReportStatus = 'pending' | 'reviewed' | 'rejected';

export interface TaskReport {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  taskName: string;
  description: string;
  link?: string; // Optional link as proof
  createdAt: string; // ISO string
  status?: ReportStatus; // Review status
  adminFeedback?: string; // Feedback from admin
  score?: number | null; // 0-100 Score from admin
  averageScore?: number | null; // Average score including attachments
  totalUpdates?: number; // Total attachments/updates for this task
  totalMenunggu?: number;
  totalDisetujui?: number;
  totalDitolak?: number;
  rawTotalScore?: number;
  rawScoredCount?: number;
}

export interface SchoolSettings {
  latitude: number;
  longitude: number;
  maxRadius: number; // in meters
}

export interface StaffTask {
  id: string;
  userId: string;
  namaTugas: string;
  deskripsi?: string;
  lampiranUrl?: string;
  createdAt?: string;
}

export interface TaskAttachment {
  id: string;
  reportId: string;
  userId: string;
  link: string;
  catatan?: string;
  score?: number;
  adminFeedback?: string;
  status?: 'pending' | 'reviewed' | 'rejected';
  createdAt: string;
  isPrimary?: boolean;
}

export interface MediaBukuSaku {
  id: string;
  judul: string;
  deskripsi?: string;
  fileUrl: string;
  uploaderId: string;
  uploaderName?: string;
  uploaderPosition?: string;
  targetUserId?: string | null;
  targetUserName?: string | null;
  targetUserPosition?: string | null;
  createdAt: string;
}

export interface JadwalGuru {
  id: string;
  judul: string;
  deskripsi?: string;
  fileUrl: string;
  uploaderId: string;
  uploaderName?: string;
  uploaderPosition?: string;
  targetUserId?: string | null;
  targetUserName?: string | null;
  targetUserPosition?: string | null;
  createdAt: string;
}
