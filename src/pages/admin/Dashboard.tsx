import React, { useEffect, useState, useCallback } from 'react';
import { getUsers, getTodayAttendance, getAllTaskReports, getStaffTasks } from '../../lib/db';
import { User, AttendanceRecord } from '../../lib/types';
import { Users, UserCheck, UserX, ClipboardList, Paperclip } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { useProfilePic } from '../../hooks/useProfilePic';
import { ProfileModal } from '../../components/ProfileModal';

import { useRealtimeSubscription } from '../../lib/useRealtime';

export const AdminDashboard: React.FC = () => {
  const [staff, setStaff] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [tasksSelesai, setTasksSelesai] = useState(0);
  const [totalLampiran, setTotalLampiran] = useState(0);
  const [lampiranMenunggu, setLampiranMenunggu] = useState(0);
  const [tasksMenunggu, setTasksMenunggu] = useState(0);
  const [tasksDitolak, setTasksDitolak] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    setTotalLampiran(reportsData.reduce((acc, r) => acc + (r.totalUpdates || 0), 0));
    setLampiranMenunggu(reportsData.reduce((acc, r) => acc + (r.totalMenunggu || 0), 0));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime: auto-refresh saat data absensi atau profil berubah
  useRealtimeSubscription(['data_absensi', 'profil_pengguna'], fetchData);

  const currentUser = JSON.parse(localStorage.getItem('hr_current_user') || '{}');

  const {
    profilePic,
    isUploadingPic,
    isProfileOpen,
    setIsProfileOpen,
    handleProfilePicChange
  } = useProfilePic(currentUser?.id, currentUser?.name);

  const totalStaff = staff.length;
  const present = attendance.filter(a => a.status === 'present').length;
  const leave = attendance.filter(a => a.status === 'leave' || a.status === 'sick').length;
  const absent = totalStaff - present - leave;

  const chartData = [
    { name: 'Hadir', value: present, color: '#10B981' },
    { name: 'Izin/Sakit', value: leave, color: '#F59E0B' },
    { name: 'Belum Hadir', value: absent, color: '#EF4444' }
  ];

  const StatCard = ({ title, value, icon, gradientClass, subtitle, className = '' }: any) => (
    <div className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${gradientClass} text-white border border-white/20 ${className}`}>
      <div className="absolute top-0 right-0 -mt-3 -mr-3 w-24 h-24 bg-white dark:bg-slate-800 opacity-[0.15] rounded-full blur-2xl"></div>
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black opacity-[0.05] rounded-full blur-xl"></div>
      <div className="relative z-10">
        <div className="absolute top-0 right-0 p-1.5 rounded-xl bg-white/20 dark:bg-slate-800/20 backdrop-blur-md border border-white/30 shadow-sm">
          {React.cloneElement(icon, { size: 16, className: 'text-white' })}
        </div>
        <p className="text-white/90 font-bold text-[10px] sm:text-[11px] uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl sm:text-3xl font-black mt-1.5 tracking-tight drop-shadow-sm">{value}</h3>
        <p className="text-white/80 text-[10px] sm:text-[11px] mt-1.5 truncate font-medium">{subtitle}</p>
      </div>
    </div>
  );

  const percentMenunggu = totalTasks > 0 ? Math.round((tasksMenunggu / totalTasks) * 100) : 0;
  const percentLampiranMenunggu = totalLampiran > 0 ? Math.round((lampiranMenunggu / totalLampiran) * 100) : 0;

  return (
    <div className="w-full space-y-10 overflow-x-clip pb-8">
      <div className="flex items-stretch justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 dark:text-slate-50 tracking-tight mb-1 sm:mb-2 truncate">Dashboard Admin</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base lg:text-lg truncate">Hai, {currentUser?.name || 'Admin'} selamat datang kembali...</p>
        </div>
        <div className="shrink-0 flex items-center justify-end relative">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="relative inline-flex items-center justify-center shrink-0 border-0 bg-transparent p-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-school-blue focus:ring-offset-2 rounded-full transition-transform hover:scale-105 w-12 h-12 sm:w-14 sm:h-14 mr-2 sm:mr-4"
            title="Profil Pengguna & Live Update"
          >
            <div className="absolute inset-0.5 sm:inset-1 rounded-full animate-ping opacity-50 bg-emerald-400"></div>

            <div className="relative z-10 w-full h-full rounded-full flex flex-col items-center justify-center text-base sm:text-lg font-bold shadow-md border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <img src={profilePic || `${import.meta.env.BASE_URL}check.png`} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `${import.meta.env.BASE_URL}check.png`; }} />
            </div>
          </button>

          <ProfileModal 
            user={currentUser}
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            profilePic={profilePic}
            isUploadingPic={isUploadingPic}
            onProfilePicChange={handleProfilePicChange}
          />
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
          title="Total Lampiran"
          value={totalLampiran}
          subtitle="Total file diunggah"
          icon={<Paperclip />}
          gradientClass="bg-gradient-to-tr from-sky-500 via-cyan-500 to-teal-400"
          className="hidden sm:block"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 flex flex-col md:flex-row gap-8 items-center">
        <div className="w-full md:w-1/2 flex flex-col items-start h-full">
          <h2 className="text-slate-600 dark:text-slate-300 font-medium mb-6">Grafik Kehadiran</h2>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: isMobile ? 0 : 30, left: isMobile ? 0 : -20, bottom: 5 }}>
                
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 14, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis
                  hide={isMobile}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8' }}
                />
                <Tooltip
                  cursor={{ fill: 'var(--chart-tooltip-cursor)' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 20px', fontWeight: 'bold', color: 'var(--chart-tooltip-text)', backgroundColor: 'var(--chart-tooltip-bg)' }}
                  itemStyle={{ color: 'var(--chart-tooltip-text)' }}
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
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Status Absensi Hari Ini</p>
            <p className="text-slate-800 dark:text-slate-50 text-3xl font-bold">{totalStaff} Staff</p>
          </div>
          <div className="pt-4 space-y-4">
            <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-500 to-green-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Hadir</span>
              <span className="font-bold text-emerald-500">{present}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div> Izin / Sakit</span>
              <span className="font-bold text-amber-500">{leave}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-rose-500 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div> Belum Hadir</span>
              <span className="font-bold text-rose-500">{totalStaff - present - leave}</span>
            </div>
          </div>
        </div>
      </div>

      {/* New Dummy Indicators Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Large Chart Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 flex flex-col md:flex-row gap-8 items-center">
          <div className="w-full md:w-1/2 flex flex-col items-start h-full">
            <h3 className="text-slate-600 dark:text-slate-300 font-medium mb-6">Distribusi Status Tugas</h3>
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
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Total Keseluruhan</p>
              <p className="text-slate-800 dark:text-slate-50 text-3xl font-bold">{totalTasks} Tugas</p>
            </div>
            <div className="pt-4 space-y-4">
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-sky-500 to-teal-400 shadow-[0_0_8px_rgba(14,165,233,0.5)]"></div> Selesai</span>
                <span className="font-bold text-sky-500">{tasksSelesai}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-500 to-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div> Menunggu</span>
                <span className="font-bold text-amber-500">{tasksMenunggu}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-rose-500 to-pink-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div> Ditolak</span>
                <span className="font-bold text-rose-500">{tasksDitolak}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gradient-to-br from-violet-500 to-indigo-400 shadow-[0_0_8px_rgba(139,92,246,0.5)]"></div> Belum Dikerjakan</span>
                <span className="font-bold text-violet-500">{totalTasks - (tasksSelesai + tasksMenunggu + tasksDitolak)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Small Cards Column */}
        <div className="flex flex-col gap-6 h-full">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-1 items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-4 relative z-10">
              {/* Custom SVG Radial Progress */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" className="stroke-slate-100 dark:stroke-slate-700" strokeWidth="12" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * percentMenunggu) / 100} strokeLinecap="round" />
                </svg>
                <span className="absolute text-xl font-bold text-slate-800 dark:text-slate-50">{percentMenunggu}%</span>

                {/* Decorative Icon Bubble */}
                <div className="absolute -top-1 -left-1 bg-white dark:bg-slate-800 p-1 rounded-full shadow-md z-20">
                  <div className="bg-[#10b981] rounded-full p-1.5">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative z-10 text-right w-1/2">
              <h3 className="text-4xl font-extrabold text-slate-700 dark:text-slate-200 mb-2">{tasksMenunggu}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">Status Menunggu Laporan</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-1 items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-4 relative z-10">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" className="stroke-slate-100 dark:stroke-slate-700" strokeWidth="12" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#ea580c" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * percentLampiranMenunggu) / 100} strokeLinecap="round" />
                </svg>
                <span className="absolute text-xl font-bold text-slate-800 dark:text-slate-50">{percentLampiranMenunggu}%</span>

                <div className="absolute -top-1 -left-1 bg-white dark:bg-slate-800 p-1 rounded-full shadow-md z-20">
                  <div className="bg-[#ea580c] rounded-full p-1.5">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative z-10 text-right w-1/2">
              <h3 className="text-4xl font-extrabold text-slate-700 dark:text-slate-200 mb-2">{lampiranMenunggu}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">Lampiran Belum Dinilai Admin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
























