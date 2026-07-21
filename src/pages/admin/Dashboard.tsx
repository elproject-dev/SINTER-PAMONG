import React, { useEffect, useState, useCallback } from 'react';
import { getUsers, getTodayAttendance, getAllTaskReports, uploadTaskAttachment, getStaffTasks } from '../../lib/db';
import { User, AttendanceRecord } from '../../lib/types';
import { Users, UserCheck, UserX, ClipboardList, CheckCircle2, LogOut, User as UserIcon, Camera, Loader2, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { supabase } from '../../lib/supabase';
import { useRealtimeSubscription } from '../../lib/useRealtime';

export const AdminDashboard: React.FC = () => {
  const [staff, setStaff] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [tasksSelesai, setTasksSelesai] = useState(0);
  const [tasksMenunggu, setTasksMenunggu] = useState(0);
  const [tasksDitolak, setTasksDitolak] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const staffData = await getUsers();
    const attendanceData = await getTodayAttendance();

    // Filter out admin users
    const nonAdminStaff = staffData.filter(s => s.role !== 'admin');
    const nonAdminIds = new Set(nonAdminStaff.map(s => s.id));
    const filteredAttendance = attendanceData.filter(a => nonAdminIds.has(a.userId));

    // Fetch task reports
    const reportsData = await getAllTaskReports();

    // Fetch all staff tasks
    const tasksData = await getStaffTasks();

    setStaff(nonAdminStaff);
    setAttendance(filteredAttendance);
    setTotalTasks(tasksData.length);
    setTasksSelesai(reportsData.filter(r => r.status === 'reviewed').length);
    setTasksMenunggu(reportsData.filter(r => r.status === 'pending').length);
    setTasksDitolak(reportsData.filter(r => r.status === 'rejected').length);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime: auto-refresh saat data absensi atau profil berubah
  useRealtimeSubscription(['data_absensi', 'profil_pengguna'], fetchData);

  const currentUser = JSON.parse(localStorage.getItem('hr_current_user') || '{}');
  const userInitial = (currentUser?.name || 'Admin').charAt(0).toUpperCase();

  useEffect(() => {
    const savedPic = localStorage.getItem(`profile_pic_${currentUser?.id}`);
    if (savedPic) setProfilePic(savedPic);
  }, [currentUser?.id]);

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPic(true);
      const url = await uploadTaskAttachment(file);
      setProfilePic(url);
      localStorage.setItem(`profile_pic_${currentUser?.id}`, url);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Gagal mengunggah foto profil. Silakan coba lagi.');
    } finally {
      setIsUploadingPic(false);
    }
  };

  const totalStaff = staff.length;
  const present = attendance.filter(a => a.status === 'present').length;
  const leave = attendance.filter(a => a.status === 'leave' || a.status === 'sick').length;
  const absent = totalStaff - present - leave;

  const chartData = [
    { name: 'Hadir', value: present, color: '#10B981' },
    { name: 'Izin/Sakit', value: leave, color: '#F59E0B' },
    { name: 'Belum Hadir', value: absent, color: '#EF4444' }
  ];

  const StatCard = ({ title, value, icon, gradientClass, subtitle }: any) => (
    <div className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${gradientClass} text-white border border-white/20`}>
      <div className="absolute top-0 right-0 -mt-3 -mr-3 w-24 h-24 bg-white opacity-[0.15] rounded-full blur-2xl"></div>
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black opacity-[0.05] rounded-full blur-xl"></div>
      <div className="relative z-10">
        <div className="absolute top-0 right-0 p-1.5 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 shadow-sm">
          {React.cloneElement(icon, { size: 16, className: 'text-white' })}
        </div>
        <p className="text-white/90 font-bold text-[10px] sm:text-[11px] uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl sm:text-3xl font-black mt-1.5 tracking-tight drop-shadow-sm">{value}</h3>
        <p className="text-white/80 text-[10px] sm:text-[11px] mt-1.5 truncate font-medium">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-10 overflow-x-clip pb-8">
      <div className="flex items-stretch justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 tracking-tight mb-1 sm:mb-2 truncate">Dashboard Admin</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg truncate">Hai, {currentUser?.name || 'Admin'} selamat datang kembali...</p>
        </div>
        <div className="shrink-0 flex items-center justify-end relative">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="relative inline-flex items-center justify-center shrink-0 border-0 bg-transparent p-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-school-blue focus:ring-offset-2 rounded-full transition-transform hover:scale-105 w-12 h-12 sm:w-14 sm:h-14 mr-2 sm:mr-4"
            title="Profil Pengguna & Live Update"
          >
            <div className="absolute inset-0.5 sm:inset-1 rounded-full animate-ping opacity-20 bg-emerald-500"></div>

            <div className="relative z-10 w-full h-full rounded-full flex flex-col items-center justify-center text-base sm:text-lg font-bold shadow-md border-2 border-emerald-500 text-emerald-700 bg-emerald-50 overflow-hidden">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span className="text-xl sm:text-2xl font-extrabold leading-none mt-1">{userInitial}</span>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Profil</span>
                </div>
              )}
            </div>
          </button>

          {/* Profile Dialog Modal */}
          {isProfileOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsProfileOpen(false)} />

              {/* Dialog Content */}
              <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-2xl max-h-[90vh] overflow-y-auto relative z-10 animate-in zoom-in-95 duration-200">
                <div className="p-4 sm:p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-school-blue/10 rounded-full flex items-center justify-center text-school-blue shrink-0">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800">Profil Pengguna</h2>
                    </div>
                    <button
                      onClick={() => setIsProfileOpen(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                      title="Tutup Popup"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content Area */}
                  <div className="bg-slate-50 p-5 sm:p-6 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-6 items-start justify-between text-left">
                    {/* Info list (left) */}
                    <div className="flex-1 space-y-4 w-full">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Nama Lengkap</p>
                        <p className="font-medium text-slate-900 text-base">{currentUser.name || 'Admin'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Email</p>
                        <p className="font-medium text-slate-900 text-base">{currentUser.email || '-'}</p>
                      </div>
                      <div className="flex flex-col items-start">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Peran</p>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-school-blue text-white capitalize shadow-sm -ml-2.5">
                          {currentUser.role || 'admin'}
                        </span>
                      </div>
                    </div>

                    {/* Avatar & Actions (right) */}
                    <div className="flex flex-col items-center gap-3 shrink-0 w-full sm:w-auto">
                      <div className="relative group w-20 h-20 rounded-full border-4 border-white shadow-md bg-slate-200 flex items-center justify-center overflow-hidden">
                        {profilePic ? (
                          <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-school-blue flex items-center justify-center text-3xl font-bold text-white">
                            {userInitial}
                          </div>
                        )}

                        {/* Hover Overlay for Upload */}
                        <div
                          className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {isUploadingPic ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          ) : (
                            <>
                              <Camera className="w-5 h-5 text-white mb-0.5" />
                              <span className="text-[8px] text-white font-bold uppercase tracking-wider">Ubah Foto</span>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleProfilePicChange}
                        />
                      </div>
                      <button
                        onClick={async () => {
                          setIsProfileOpen(false);
                          if (window.confirm('Apakah Anda yakin ingin keluar?')) {
                            await supabase.auth.signOut();
                            localStorage.removeItem('hr_current_user');
                            window.location.href = '/';
                          }
                        }}
                        className="w-full flex items-center justify-center gap-1.5 bg-rose-500 text-white hover:bg-rose-600 hover:shadow-md px-3 py-2 rounded-full transition-all text-sm font-semibold border border-transparent mt-5 shadow-sm"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Total Staff"
          value={totalStaff}
          subtitle="Guru & karyawan"
          icon={<Users />}
          gradientClass="bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-pink-500"
        />
        <StatCard
          title="Hadir"
          value={present}
          subtitle={`${Math.round((present / totalStaff) * 100 || 0)}% kehadiran`}
          icon={<UserCheck />}
          gradientClass="bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500"
        />
        <StatCard
          title="Izin / Sakit"
          value={leave}
          subtitle={`${leave} orang hari ini`}
          icon={<UserX />}
          gradientClass="bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500"
        />
        <StatCard
          title="Total Tugas"
          value={totalTasks}
          subtitle="Semua tugas"
          icon={<ClipboardList />}
          gradientClass="bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600"
        />
        <StatCard
          title="Tugas Selesai"
          value={tasksSelesai}
          subtitle="Disetujui admin"
          icon={<CheckCircle2 />}
          gradientClass="bg-gradient-to-tr from-sky-500 via-cyan-500 to-teal-400"
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col md:flex-row gap-8 items-center">
        <div className="w-full md:w-1/2 flex flex-col items-start h-full">
          <h2 className="text-slate-600 font-medium mb-6">Grafik Kehadiran</h2>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 14, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8' }}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 20px', fontWeight: 'bold', color: '#1e293b' }}
                  itemStyle={{ color: '#0f172a' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={80}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="w-full md:w-1/2 space-y-4">
          <div>
            <p className="text-slate-500 font-medium mb-1">Status Absensi Hari Ini</p>
            <p className="text-slate-800 text-3xl font-bold">{totalStaff} Staff</p>
          </div>
          <div className="pt-4 space-y-4">
            <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-600 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-500 to-green-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Hadir</span>
              <span className="font-bold text-emerald-500">{present}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-600 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div> Izin / Sakit</span>
              <span className="font-bold text-amber-500">{leave}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-600 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-rose-500 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div> Belum Hadir</span>
              <span className="font-bold text-rose-500">{totalStaff - present - leave}</span>
            </div>
          </div>
        </div>
      </div>

      {/* New Dummy Indicators Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Large Chart Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col md:flex-row gap-8 items-center">
          <div className="w-full md:w-1/2 flex flex-col items-start h-full">
            <h3 className="text-slate-600 font-medium mb-6">Distribusi Status Tugas</h3>
            <div className="w-full h-64 relative flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="gradSelesai" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#2dd4bf" />
                    </linearGradient>
                    <linearGradient id="gradMenunggu" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                    <linearGradient id="gradDitolak" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#fb7185" />
                    </linearGradient>
                    <linearGradient id="gradBelum" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={[
                      { name: 'Selesai', value: tasksSelesai, color: 'url(#gradSelesai)' },
                      { name: 'Menunggu', value: tasksMenunggu, color: 'url(#gradMenunggu)' },
                      { name: 'Ditolak', value: tasksDitolak, color: 'url(#gradDitolak)' },
                      { name: 'Belum Dikerjakan', value: totalTasks - (tasksSelesai + tasksMenunggu + tasksDitolak), color: 'url(#gradBelum)' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    stroke="none"
                  >
                    {[
                      { color: 'url(#gradSelesai)' },
                      { color: 'url(#gradMenunggu)' },
                      { color: 'url(#gradDitolak)' },
                      { color: 'url(#gradBelum)' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="w-full md:w-1/2 space-y-4">
            <div>
              <p className="text-slate-500 font-medium mb-1">Total Keseluruhan</p>
              <p className="text-slate-800 text-3xl font-bold">{totalTasks} Tugas</p>
            </div>
            <div className="pt-4 space-y-4">
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-600 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-sky-500 to-teal-400 shadow-[0_0_8px_rgba(14,165,233,0.5)]"></div> Selesai</span>
                <span className="font-bold text-sky-500">{tasksSelesai}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-600 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-500 to-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div> Menunggu</span>
                <span className="font-bold text-amber-500">{tasksMenunggu}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-600 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-rose-500 to-pink-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div> Ditolak</span>
                <span className="font-bold text-rose-500">{tasksDitolak}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-600 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-violet-500 to-indigo-400 shadow-[0_0_8px_rgba(139,92,246,0.5)]"></div> Belum Dikerjakan</span>
                <span className="font-bold text-violet-500">{totalTasks - (tasksSelesai + tasksMenunggu + tasksDitolak)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Small Cards Column */}
        <div className="flex flex-col gap-6 h-full">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-1 items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-4 relative z-10">
              {/* Custom SVG Radial Progress */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#991b1b" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * 42) / 100} strokeLinecap="round" />
                </svg>
                <span className="absolute text-xl font-bold text-slate-800">42%</span>

                {/* Decorative Icon Bubble */}
                <div className="absolute -top-1 -left-1 bg-white p-1 rounded-full shadow-md z-20">
                  <div className="bg-[#991b1b] rounded-full p-1.5">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative z-10 text-right w-1/2">
              <h3 className="text-4xl font-extrabold text-slate-700 mb-2">40,614</h3>
              <p className="text-xs text-slate-500 leading-tight">A wonderful serenity has taken possession of my entire</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-1 items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-4 relative z-10">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#ea580c" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * 30) / 100} strokeLinecap="round" />
                </svg>
                <span className="absolute text-xl font-bold text-slate-800">30%</span>

                <div className="absolute -top-1 -left-1 bg-white p-1 rounded-full shadow-md z-20">
                  <div className="bg-[#ea580c] rounded-full p-1.5">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative z-10 text-right w-1/2">
              <h3 className="text-4xl font-extrabold text-slate-700 mb-2">13,256</h3>
              <p className="text-xs text-slate-500 leading-tight">A wonderful serenity has taken possession of my entire</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
