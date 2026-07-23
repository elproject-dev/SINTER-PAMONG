import { User, AttendanceRecord, KPIEvaluation, TaskReport, SchoolSettings, MasterJabatan, StaffTask, TaskAttachment } from './types';
import { format } from 'date-fns';
import { supabase } from './supabase';

export const initializeDB = async () => {
  // Not needed for Supabase
};

// ================= USERS & PROFILES =================

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('profil_pengguna').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return data.map((d: any) => ({
    id: d.id,
    name: d.name,
    role: d.role,
    position: d.position,
    jobRoles: d.job_roles,
    isApproved: d.is_approved,
    email: d.email, // Optional if added later
    phone: d.no_telp
  })) as User[];
};

export const getStaff = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('profil_pengguna').select('*').eq('role', 'staff');
  if (error) {
    console.error('Error fetching staff:', error);
    return [];
  }
  return data.map((d: any) => ({
    id: d.id,
    name: d.name,
    role: d.role,
    position: d.position,
    jobRoles: d.job_roles,
    isApproved: d.is_approved,
    email: d.email,
    phone: d.no_telp
  })) as User[];
};

export const registerUser = async (user: User) => {
  // Wait, real registration requires Supabase Auth: supabase.auth.signUp()
  // This will be handled directly in Register.tsx. 
  // For profiles, it should trigger on sign up or we manually insert.
  const { error } = await supabase.from('profil_pengguna').insert([
    {
      id: user.id, // Must match Auth ID
      name: user.name,
      role: user.role,
      position: user.position,
      job_roles: user.jobRoles || [],
      is_approved: false,
      no_telp: user.phone
    }
  ]);
  if (error) console.error('Error registering profile:', error);
};

export const updateStaffAssignment = async (userId: string, updates: Partial<User>) => {
  const { error } = await supabase
    .from('profil_pengguna')
    .update({
      role: updates.role,
      position: updates.position,
      job_roles: updates.jobRoles,
      is_approved: updates.isApproved,
      no_telp: updates.phone
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating staff assignment:', error);
    throw error;
  }
};

export const updateUserProfileName = async (userId: string, name: string) => {
  const { error } = await supabase
    .from('profil_pengguna')
    .update({ name })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user profile name:', error);
    throw error;
  }
};

export const deleteUser = async (userId: string) => {
  const { error } = await supabase
    .from('profil_pengguna')
    .delete()
    .eq('id', userId);

  if (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// ================= ATTENDANCE =================

export const getAttendance = async (): Promise<AttendanceRecord[]> => {
  const { data, error } = await supabase.from('data_absensi').select('*');
  if (error) {
    console.error('Error fetching attendance:', error);
    return [];
  }
  return data.map((d: any) => ({
    id: d.id,
    userId: d.user_id,
    date: d.date,
    checkIn: d.check_in,
    checkOut: d.check_out,
    status: d.status,
    note: d.note,
    latitude: d.latitude,
    longitude: d.longitude,
    selfieUrl: d.selfie_url
  })) as AttendanceRecord[];
};

export const saveAttendance = async (record: AttendanceRecord) => {
  const { error } = await supabase.from('data_absensi').upsert({
    id: record.id,
    user_id: record.userId,
    date: record.date,
    check_in: record.checkIn,
    check_out: record.checkOut,
    status: record.status,
    note: record.note,
    latitude: record.latitude,
    longitude: record.longitude,
    selfie_url: record.selfieUrl
  });
  if (error) console.error('Error saving attendance:', error);
};

export const getTodayAttendance = async (): Promise<AttendanceRecord[]> => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase.from('data_absensi').select('*').eq('date', today);
  if (error) {
    console.error('Error fetching today attendance:', error);
    return [];
  }
  return data.map((d: any) => ({
    id: d.id,
    userId: d.user_id,
    date: d.date,
    checkIn: d.check_in,
    checkOut: d.check_out,
    status: d.status,
    note: d.note,
    latitude: d.latitude,
    longitude: d.longitude,
    selfieUrl: d.selfie_url
  })) as AttendanceRecord[];
};

export const getUserTodayAttendance = async (userId: string): Promise<AttendanceRecord | undefined> => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('data_absensi')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (error || !data) return undefined;

  return {
    id: data.id,
    userId: data.user_id,
    date: data.date,
    checkIn: data.check_in,
    checkOut: data.check_out,
    status: data.status,
    note: data.note,
    latitude: data.latitude,
    longitude: data.longitude,
    selfieUrl: data.selfie_url
  };
};

export const getUserAllAttendance = async (userId: string): Promise<AttendanceRecord[]> => {
  const { data, error } = await supabase
    .from('data_absensi')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching user all attendance:', error);
    return [];
  }

  return data.map((d: any) => ({
    id: d.id,
    userId: d.user_id,
    date: d.date,
    checkIn: d.check_in,
    checkOut: d.check_out,
    status: d.status,
    note: d.note,
    latitude: d.latitude,
    longitude: d.longitude,
    selfieUrl: d.selfie_url
  })) as AttendanceRecord[];
};

// ================= KPI =================

export const getKPIs = async (): Promise<KPIEvaluation[]> => {
  const { data, error } = await supabase.from('penilaian_kpi').select('*, nilai_kpi(*)');
  if (error) return [];

  return data.map((d: any) => ({
    id: d.id,
    userId: d.user_id,
    evaluatorId: d.evaluator_id,
    month: d.month,
    notes: d.notes,
    createdAt: d.created_at,
    taskScores: d.nilai_kpi.map((s: any) => ({ task: s.task, score: s.score }))
  }));
};

export const saveKPI = async (kpi: KPIEvaluation) => {
  // Check and delete existing KPI for the same user and month
  const { data: existingKPIs } = await supabase
    .from('penilaian_kpi')
    .select('id')
    .eq('user_id', kpi.userId)
    .eq('month', kpi.month);

  if (existingKPIs && existingKPIs.length > 0) {
    const existingIds = existingKPIs.map(k => k.id);
    // Delete scores first (cascade might not be set up)
    await supabase.from('nilai_kpi').delete().in('kpi_id', existingIds);
    // Delete KPI records
    await supabase.from('penilaian_kpi').delete().in('id', existingIds);
  }

  const { error: kpiError } = await supabase.from('penilaian_kpi').insert({
    id: kpi.id,
    user_id: kpi.userId,
    evaluator_id: kpi.evaluatorId,
    month: kpi.month,
    notes: kpi.notes,
  });

  if (kpiError) {
    console.error('Error saving KPI:', kpiError);
    return;
  }

  const scoresToInsert = kpi.taskScores.map(score => ({
    kpi_id: kpi.id,
    task: score.task,
    score: score.score
  }));

  await supabase.from('nilai_kpi').insert(scoresToInsert);
};

export const getUserKPIs = async (userId: string): Promise<KPIEvaluation[]> => {
  const { data, error } = await supabase
    .from('penilaian_kpi')
    .select('*, nilai_kpi(*)')
    .eq('user_id', userId);

  if (error) return [];

  return data.map((d: any) => ({
    id: d.id,
    userId: d.user_id,
    evaluatorId: d.evaluator_id,
    month: d.month,
    notes: d.notes,
    createdAt: d.created_at,
    taskScores: d.nilai_kpi.map((s: any) => ({ task: s.task, score: s.score }))
  }));
};

// ================= TASK REPORTS =================

export const getUserTaskReports = async (userId: string): Promise<TaskReport[]> => {
  const { data, error } = await supabase
    .from('penilaian_tugas')
    .select('*, lampiran_tugas(score, status)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];

  return data.map((d: any) => {
    let totalScore = 0;
    let scoredCount = 0;
    let totalMenunggu = 0;
    let totalDisetujui = 0;
    let totalDitolak = 0;
    
    if (d.link) {
      if (d.status === 'pending') totalMenunggu++;
      if (d.status === 'reviewed') {
        totalDisetujui++;
        if (d.score) {
          totalScore += d.score;
          scoredCount++;
        }
      }
      if (d.status === 'rejected') totalDitolak++;
    }
    
    if (d.lampiran_tugas && Array.isArray(d.lampiran_tugas)) {
      d.lampiran_tugas.forEach((l: any) => {
        if (l.status === 'pending') totalMenunggu++;
        if (l.status === 'reviewed') {
          totalDisetujui++;
          if (l.score) {
            totalScore += l.score;
            scoredCount++;
          }
        }
        if (l.status === 'rejected') totalDitolak++;
      });
    }

    const averageScore = scoredCount > 0 ? Number((totalScore / scoredCount).toFixed(1)) : (d.score ? Math.round(d.score) : null);

    return {
      id: d.id,
      userId: d.user_id,
      date: d.date,
      taskName: d.task_name,
      description: d.description,
      link: d.link,
      createdAt: d.created_at,
      status: d.status,
      adminFeedback: d.admin_feedback,
      score: d.score,
      averageScore: averageScore,
      totalUpdates: (d.link ? 1 : 0) + (d.lampiran_tugas?.length || 0),
      totalMenunggu,
      totalDisetujui,
      totalDitolak
    };
  });
};

export const getAllTaskReports = async (): Promise<TaskReport[]> => {
  const { data, error } = await supabase
    .from('penilaian_tugas')
    .select('*, lampiran_tugas(score, status)')
    .order('created_at', { ascending: false });

  if (error) return [];

  return data.map((d: any) => {
    let totalScore = 0;
    let scoredCount = 0;
    let totalMenunggu = 0;
    let totalDisetujui = 0;
    let totalDitolak = 0;
    
    if (d.link) {
      if (d.status === 'pending') totalMenunggu++;
      if (d.status === 'reviewed') {
        totalDisetujui++;
        if (d.score) {
          totalScore += d.score;
          scoredCount++;
        }
      }
      if (d.status === 'rejected') totalDitolak++;
    }
    
    if (d.lampiran_tugas && Array.isArray(d.lampiran_tugas)) {
      d.lampiran_tugas.forEach((l: any) => {
        if (l.status === 'pending') totalMenunggu++;
        if (l.status === 'reviewed') {
          totalDisetujui++;
          if (l.score) {
            totalScore += l.score;
            scoredCount++;
          }
        }
        if (l.status === 'rejected') totalDitolak++;
      });
    }

    const averageScore = scoredCount > 0 ? Number((totalScore / scoredCount).toFixed(1)) : (d.score ? Math.round(d.score) : null);

    return {
      id: d.id,
      userId: d.user_id,
      date: d.date,
      taskName: d.task_name,
      description: d.description,
      link: d.link,
      createdAt: d.created_at,
      status: d.status,
      adminFeedback: d.admin_feedback,
      score: d.score,
      averageScore: averageScore,
      totalUpdates: (d.link ? 1 : 0) + (d.lampiran_tugas?.length || 0),
      totalMenunggu,
      totalDisetujui,
      totalDitolak
    };
  });
};

export const saveTaskReport = async (report: TaskReport) => {
  const { error } = await supabase.from('penilaian_tugas').insert({
    id: report.id,
    user_id: report.userId,
    date: report.date,
    task_name: report.taskName,
    description: report.description,
    link: report.link,
    status: report.status || 'pending'
  });
  if (error) console.error('Error saving task report:', error);
};

export const updateTaskReportStatus = async (id: string, status: string, feedback: string = '', score: number | null = null) => {
  const { error } = await supabase
    .from('penilaian_tugas')
    .update({ status, admin_feedback: feedback, score })
    .eq('id', id);

  if (error) {
    console.error('Error updating task report status:', error);
  }
};

export const updateTaskReportScore = async (id: string, score: number) => {
  const { error } = await supabase
    .from('penilaian_tugas')
    .update({ score, status: 'reviewed' })
    .eq('id', id);
    
  if (error) {
    console.error('Error updating task report score:', error);
  }
};

export const updateTaskReport = async (id: string, taskName: string, description: string, link: string) => {
  const { error } = await supabase
    .from('penilaian_tugas')
    .update({
      task_name: taskName,
      description: description,
      link: link || null,
      status: 'pending', // Reset status to pending for admin re-review
      score: null // Reset score
    })
    .eq('id', id);
  if (error) throw error;
};

export const deleteTaskReport = async (id: string) => {
  const { error } = await supabase.from('penilaian_tugas').delete().eq('id', id);
  if (error) throw error;
};

// ================= SETTINGS =================

export const getSchoolSettings = async (): Promise<SchoolSettings> => {
  const defaultSettings = { latitude: -6.175110, longitude: 106.827153, maxRadius: 100 };
  const { data, error } = await supabase.from('pengaturan_sekolah').select('*').maybeSingle();

  if (error || !data) return defaultSettings;

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    maxRadius: data.max_radius
  };
};

export const saveSchoolSettings = async (settings: SchoolSettings) => {
  const { error } = await supabase.from('pengaturan_sekolah').upsert({
    id: 1, // Only one row
    latitude: settings.latitude,
    longitude: settings.longitude,
    max_radius: settings.maxRadius
  });
  if (error) console.error('Error saving settings:', error);
};

// ================= MASTER JABATAN =================

export const getPositions = async (): Promise<MasterJabatan[]> => {
  const { data, error } = await supabase.from('master_jabatan').select('*').order('nama_jabatan');
  if (error) {
    console.error('Error fetching positions:', error);
    return [];
  }
  return data as MasterJabatan[];
};

export const addPosition = async (namaJabatan: string) => {
  const { error } = await supabase.from('master_jabatan').insert({ nama_jabatan: namaJabatan });
  if (error) throw error;
};

export const deletePosition = async (id: string) => {
  const { error } = await supabase.from('master_jabatan').delete().eq('id', id);
  if (error) throw error;
};

export const updatePosition = async (id: string, namaJabatan: string) => {
  const { error } = await supabase
    .from('master_jabatan')
    .update({ nama_jabatan: namaJabatan })
    .eq('id', id);
  if (error) throw error;
};

// ================= TUGAS STAFF =================

export const uploadTaskAttachment = async (file: File, taskName: string): Promise<string> => {
  const safeTaskName = taskName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = `${safeTaskName}/${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('lampiran_tugas_admin')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('lampiran_tugas_admin')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const uploadProfilePicture = async (file: File, staffName: string, oldUrl?: string | null): Promise<string> => {
  // Kompresi ke format WebP
  const compressedFile = await new Promise<File>((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = (error) => reject(error);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // fallback jika gagal mendapatkan context
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Gunakan nama asli tapi ubah ekstensinya jadi .webp
            const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const newFile = new File([blob], `${originalName}.webp`, { type: 'image/webp' });
            resolve(newFile);
          } else {
            resolve(file); // fallback
          }
        },
        'image/webp',
        0.8 // Kualitas 80%
      );
    };

    reader.readAsDataURL(file);
  });

  const safeStaffName = staffName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = new Date().getTime();
  const filePath = `${safeStaffName}/profile_${timestamp}.webp`;

  // Kumpulkan semua file yang mungkin perlu dihapus
  const filesToDelete = new Set<string>();

  if (oldUrl) {
    try {
      const urlObj = new URL(oldUrl);
      const pathParts = urlObj.pathname.split('/');
      const bucketIndex = pathParts.indexOf('profile_pictures');
      if (bucketIndex !== -1 && pathParts.length > bucketIndex + 1) {
        const oldFilePath = pathParts.slice(bucketIndex + 1).join('/');
        filesToDelete.add(oldFilePath);
      }
    } catch (e) {
      console.error('Failed to parse old photo url:', e);
    }
  }

  // Juga hapus via list (pembersihan ekstra semua file di folder user)
  try {
    const { data: existingFiles } = await supabase.storage
      .from('profile_pictures')
      .list(safeStaffName);
    
    if (existingFiles && existingFiles.length > 0) {
      existingFiles.forEach(f => {
        // Jangan hapus .emptyFolderPlaceholder
        if (f.name !== '.emptyFolderPlaceholder') {
          filesToDelete.add(`${safeStaffName}/${f.name}`);
        }
      });
    }
  } catch (e) {
    console.error('List failed:', e);
  }

  // Eksekusi penghapusan semua file lama sebelum upload baru
  if (filesToDelete.size > 0) {
    const { error: removeError } = await supabase.storage.from('profile_pictures').remove(Array.from(filesToDelete));
    if (removeError) {
      console.error('Warning: Failed to delete old profile pictures (RLS issue?):', removeError);
    }
  }

  const { error: uploadError } = await supabase.storage
    .from('profile_pictures')
    .upload(filePath, compressedFile, { upsert: true });

  if (uploadError) {
    console.error('Error uploading profile picture:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('profile_pictures')
    .getPublicUrl(filePath);

  return `${data.publicUrl}?t=${new Date().getTime()}`;
};

export const getStaffTasks = async (userId?: string): Promise<StaffTask[]> => {
  let query = supabase.from('tugas_staff').select('*').order('created_at', { ascending: true });
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching staff tasks:', error);
    return [];
  }
  return data.map((d: any) => ({
    id: d.id,
    userId: d.user_id,
    namaTugas: d.nama_tugas,
    deskripsi: d.deskripsi,
    lampiranUrl: d.lampiran_url,
    createdAt: d.created_at
  }));
};

export const addStaffTask = async (task: Omit<StaffTask, 'id' | 'createdAt'>) => {
  const { error } = await supabase.from('tugas_staff').insert({
    user_id: task.userId,
    nama_tugas: task.namaTugas,
    deskripsi: task.deskripsi || null,
    lampiran_url: task.lampiranUrl || null
  });
  if (error) throw error;
};

export const deleteStaffTask = async (id: string) => {
  const { error } = await supabase.from('tugas_staff').delete().eq('id', id);
  if (error) throw error;
};

// ================= LAMPIRAN TUGAS (MULTI-ATTACHMENT) =================

export const getTaskAttachments = async (reportId: string): Promise<TaskAttachment[]> => {
  const { data, error } = await supabase
    .from('lampiran_tugas')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching task attachments:', error);
    return [];
  }

  return data.map((d: any) => ({
    id: d.id,
    reportId: d.report_id,
    userId: d.user_id,
    link: d.link,
    catatan: d.catatan,
    score: d.score,
    adminFeedback: d.admin_feedback,
    status: d.status,
    createdAt: d.created_at
  }));
};

export const addTaskAttachment = async (attachment: Omit<TaskAttachment, 'id' | 'createdAt'>) => {
  const { error } = await supabase.from('lampiran_tugas').insert({
    report_id: attachment.reportId,
    user_id: attachment.userId,
    link: attachment.link,
    catatan: attachment.catatan || null
  });
  if (error) {
    console.error('Error adding task attachment:', error);
    throw error;
  }
};

export const deleteTaskAttachment = async (id: string) => {
  const { error } = await supabase.from('lampiran_tugas').delete().eq('id', id);
  if (error) {
    console.error('Error deleting task attachment:', error);
    throw error;
  }
};

export const updateTaskAttachmentScore = async (id: string, score: number | null, adminFeedback: string, status: string) => {
  const { error } = await supabase
    .from('lampiran_tugas')
    .update({ score, admin_feedback: adminFeedback, status })
    .eq('id', id);
    
  if (error) {
    console.error('Error updating task attachment score:', error);
    throw error;
  }
};

export const reviseTaskAttachment = async (id: string, link: string, catatan?: string) => {
  const updateData: any = { 
    link: link, 
    status: 'pending',
    score: null 
  };
  if (catatan !== undefined) {
    updateData.catatan = catatan;
  }

  const { error } = await supabase
    .from('lampiran_tugas')
    .update(updateData)
    .eq('id', id);
    
  if (error) {
    console.error('Error revising task attachment:', error);
    throw error;
  }
};

export const updateStaffTask = async (id: string, task: { namaTugas: string; deskripsi?: string; lampiranUrl?: string }) => {
  const { error } = await supabase
    .from('tugas_staff')
    .update({
      nama_tugas: task.namaTugas,
      deskripsi: task.deskripsi || null,
      lampiran_url: task.lampiranUrl || null
    })
    .eq('id', id);
  if (error) throw error;
};

export const updateUserPassword = async (password: string) => {
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error('Error retrieving auth session:', sessionError);
    throw sessionError;
  }
  const session = data.session;
  if (!session) {
    console.error('No auth session. User must be logged in to change password.');
    throw new Error('Auth session missing. Please log in again.');
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

export const getUserMonthlyAttendance = async (userId: string): Promise<AttendanceRecord[]> => {
  const date = new Date();
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('data_absensi')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startOfMonth)
    .lte('date', endOfMonth);

  if (error) return [];

  return data.map((d: any) => ({
    id: d.id,
    userId: d.user_id,
    date: d.date,
    checkIn: d.check_in,
    checkOut: d.check_out,
    status: d.status,
    note: d.note,
    latitude: d.latitude,
    longitude: d.longitude,
    selfieUrl: d.selfie_url
  }));
};

// ================= BUKU SAKU =================

export const getMediaBukuSaku = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('media_buku_saku')
    .select(`
      *,
      uploader:uploader_id(name, position),
      targetUser:target_user_id(name, position)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching media:', error);
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    judul: item.judul,
    deskripsi: item.deskripsi,
    fileUrl: item.file_url,
    fileType: item.file_type,
    uploaderId: item.uploader_id,
    targetUserId: item.target_user_id,
    createdAt: item.created_at,
    uploaderName: item.uploader?.name || 'Admin',
    uploaderPosition: item.uploader?.position,
    targetUserName: item.targetUser?.name,
    targetUserPosition: item.targetUser?.position
  }));
};

export const uploadMediaFile = async (file: File, folderName?: string): Promise<string> => {
  const dateStr = format(new Date(), 'ddMMMyyyy').toUpperCase();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${dateStr}_${safeName}`;
  const path = folderName ? `${folderName}/${fileName}` : `Global/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('buku_saku_media')
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('buku_saku_media')
    .getPublicUrl(path);

  return data.publicUrl;
};

export const addMediaBukuSaku = async (media: any) => {
  const { error } = await supabase
    .from('media_buku_saku')
    .insert([{
      judul: media.judul,
      deskripsi: media.deskripsi,
      file_url: media.fileUrl,
      uploader_id: media.uploaderId,
      target_user_id: media.targetUserId || null
    }]);
  if (error) throw error;
};

export const updateMediaBukuSaku = async (id: string, media: any) => {
  const updateData: any = {
    judul: media.judul,
    deskripsi: media.deskripsi,
    target_user_id: media.targetUserId || null
  };
  if (media.fileUrl) {
    updateData.file_url = media.fileUrl;
  }
  
  const { error } = await supabase
    .from('media_buku_saku')
    .update(updateData)
    .eq('id', id);
    
  if (error) throw error;
};

export const deleteMediaBukuSaku = async (id: string, fileUrl: string) => {
  // Extract path from URL for storage deletion
  const urlParts = fileUrl.split('/buku_saku_media/');
  if (urlParts.length > 1) {
    const path = urlParts[1];
    await supabase.storage.from('buku_saku_media').remove([path]);
  }

  const { error } = await supabase
    .from('media_buku_saku')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const getStaffList = async () => {
  const { data, error } = await supabase
    .from('profil_pengguna')
    .select('id, name, position')
    .eq('role', 'staff')
    .order('name');
  if (error) throw error;
  return data;
};

// ================= JADWAL GURU =================

export const getJadwalGuru = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('jadwal_guru')
    .select(`
      *,
      uploader:uploader_id(name, position),
      targetUser:target_user_id(name, position)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching jadwal guru:', error);
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    judul: item.judul,
    deskripsi: item.deskripsi,
    fileUrl: item.file_url,
    uploaderId: item.uploader_id,
    targetUserId: item.target_user_id,
    createdAt: item.created_at,
    uploaderName: item.uploader?.name || 'Admin',
    uploaderPosition: item.uploader?.position,
    targetUserName: item.targetUser?.name,
    targetUserPosition: item.targetUser?.position
  }));
};

export const uploadJadwalFile = async (file: File, folderName?: string): Promise<string> => {
  const dateStr = format(new Date(), 'ddMMMyyyy').toUpperCase();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${dateStr}_${safeName}`;
  const path = folderName ? `${folderName}/${fileName}` : `Global/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('jadwal_guru_media')
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('jadwal_guru_media')
    .getPublicUrl(path);

  return data.publicUrl;
};

export const addJadwalGuru = async (media: any) => {
  const { error } = await supabase
    .from('jadwal_guru')
    .insert([{
      judul: media.judul,
      deskripsi: media.deskripsi,
      file_url: media.fileUrl,
      uploader_id: media.uploaderId,
      target_user_id: media.targetUserId || null
    }]);
  if (error) throw error;
};

export const updateJadwalGuru = async (id: string, media: any) => {
  const { error } = await supabase
    .from('jadwal_guru')
    .update({
      judul: media.judul,
      deskripsi: media.deskripsi,
      file_url: media.fileUrl,
      target_user_id: media.targetUserId || null
    })
    .eq('id', id);
  if (error) throw error;
};

export const deleteJadwalGuru = async (id: string, fileUrl: string) => {
  const urlParts = fileUrl.split('/jadwal_guru_media/');
  if (urlParts.length > 1) {
    const path = urlParts[1];
    await supabase.storage.from('jadwal_guru_media').remove([path]);
  }

  const { error } = await supabase
    .from('jadwal_guru')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const deleteStorageFile = async (bucket: string, fileUrl: string) => {
  const urlParts = fileUrl.split(`/${bucket}/`);
  if (urlParts.length > 1) {
    const path = urlParts[1];
    await supabase.storage.from(bucket).remove([path]);
  }
};
