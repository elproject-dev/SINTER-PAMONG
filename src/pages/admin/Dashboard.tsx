import React, { useEffect, useState, useCallback } from 'react';
import { getUsers, getTodayAttendance } from '../../lib/db';
import { User, AttendanceRecord } from '../../lib/types';
import { Users, UserCheck, UserX, LogOut, User as UserIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { supabase } from '../../lib/supabase';
import { useRealtimeSubscription } from '../../lib/useRealtime';

export const AdminDashboard: React.FC = () => {
  const [staff, setStaff] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const staffData = await getUsers();
    const attendanceData = await getTodayAttendance();
    setStaff(staffData);
    setAttendance(attendanceData);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime: auto-refresh saat data absensi atau profil berubah
  useRealtimeSubscription(['data_absensi', 'profil_pengguna'], fetchData);

  const currentUser = JSON.parse(localStorage.getItem('hr_current_user') || '{}');
  const userInitial = (currentUser?.name || 'Admin').charAt(0).toUpperCase();

  const totalStaff = staff.length;
  const present = attendance.filter(a => a.status === 'present').length;
  const leave = attendance.filter(a => a.status === 'leave' || a.status === 'sick').length;
  const absent = totalStaff - present - leave;

  const chartData = [
    { name: 'Hadir', value: present, color: '#10B981' },
    { name: 'Izin/Sakit', value: leave, color: '#F59E0B' },
    { name: 'Belum Hadir', value: absent, color: '#EF4444' }
  ];

  const StatCard = ({ title, value, icon, colorClass, gradientClass, subtitle }: any) => (
    <div className={`relative overflow-hidden rounded-3xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${gradientClass} text-white`}>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-white/80 font-medium tracking-wide text-sm uppercase">{title}</p>
          <h3 className="text-4xl font-extrabold mt-2 mb-1">{value}</h3>
          <p className="text-white/70 text-sm">{subtitle}</p>
        </div>
        <div className={`p-4 rounded-2xl bg-white/20 backdrop-blur-sm ${colorClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 tracking-tight mb-1 sm:mb-2 truncate">Dashboard Admin</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg truncate">Hai, {currentUser?.name || 'Admin'} selamat datang kembali...</p>
        </div>
        <div className="shrink-0 flex items-center justify-end relative">
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="relative inline-flex items-center justify-center shrink-0 border-0 bg-transparent p-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-school-blue focus:ring-offset-2 rounded-full transition-transform hover:scale-105" 
            title="Profil Pengguna & Live Update"
          >
            <div className="absolute inset-0 rounded-full animate-ping opacity-40 bg-emerald-500"></div>
            <div className="relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-base sm:text-lg font-bold shadow-md border-2 border-emerald-500 text-emerald-700 bg-emerald-50">
              {userInitial}
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
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-school-blue/10 rounded-xl flex items-center justify-center text-school-blue shrink-0">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Profil Pengguna</h2>
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
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Peran</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-school-blue/10 text-school-blue capitalize">
                          {currentUser.role || 'admin'}
                        </span>
                      </div>
                    </div>

                    {/* Avatar & Actions (right) */}
                    <div className="flex flex-col items-center gap-3 shrink-0 w-full sm:w-auto">
                      <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-slate-200 flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full bg-school-blue flex items-center justify-center text-3xl font-bold text-white">
                          {userInitial}
                        </div>
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
                        className="w-full flex items-center justify-center gap-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg transition-colors text-sm font-semibold border border-red-100 hover:border-red-500 mt-2"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard 
          title="Total Staff" 
          value={totalStaff} 
          subtitle="Seluruh guru & karyawan"
          icon={<Users size={28} className="text-white" />}
          gradientClass="bg-gradient-to-br from-indigo-600 to-blue-600"
          colorClass="text-blue-100"
        />
        <StatCard 
          title="Hadir Hari Ini" 
          value={present} 
          subtitle={`${Math.round((present/totalStaff)*100 || 0)}% tingkat kehadiran`}
          icon={<UserCheck size={28} className="text-white" />}
          gradientClass="bg-gradient-to-br from-emerald-500 to-green-600"
          colorClass="text-green-100"
        />
        <StatCard 
          title="Izin / Sakit" 
          value={leave} 
          subtitle={`${leave} orang tidak hadir hari ini`}
          icon={<UserX size={28} className="text-white" />}
          gradientClass="bg-gradient-to-br from-amber-500 to-orange-500"
          colorClass="text-amber-100"
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Grafik Kehadiran</h2>
            <p className="text-slate-500 text-sm mt-1">Distribusi status absensi hari ini</p>
          </div>
        </div>
        <div className="h-96 w-full">
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

      {/* New Dummy Indicators Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Large Chart Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col md:flex-row gap-8 items-center">
          <div className="w-full md:w-1/2 flex flex-col items-start h-full">
            <h3 className="text-slate-600 font-medium mb-6">Quota on March 2022</h3>
            <div className="w-full h-64 relative flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Item One', value: 3.2, color: '#991b1b' }, // darker red
                      { name: 'Item Two', value: 8.2, color: '#450a0a' }, // very dark red
                      { name: 'Item Three', value: 1.4, color: '#ea580c' }, // orange
                      { name: 'Item Four', value: 1.2, color: '#eab308' }, // yellow
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    stroke="none"
                  >
                    {[
                      { color: '#991b1b' },
                      { color: '#450a0a' },
                      { color: '#ea580c' },
                      { color: '#eab308' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Optional labels could be added here manually or via recharts */}
            </div>
          </div>
          <div className="w-full md:w-1/2 space-y-4">
            <div>
              <p className="text-slate-500 font-medium mb-1">A wonderful serenity</p>
              <p className="text-slate-500 font-medium">has taken possession</p>
            </div>
            <div className="pt-4 space-y-4">
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-600">Item One</span>
                <span className="font-bold text-[#991b1b]">+1512</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-600">Item Two</span>
                <span className="font-bold text-[#450a0a]">+4176</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-600">Item Three</span>
                <span className="font-bold text-[#ea580c]">+2145</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-600">Item Four</span>
                <span className="font-bold text-[#eab308]">+1452</span>
              </div>
            </div>
          </div>
        </div>

        {/* Small Cards Column */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex items-center justify-between relative overflow-hidden">
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

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex items-center justify-between relative overflow-hidden">
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
