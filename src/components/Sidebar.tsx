import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserCheck, LogOut, FileText, ClipboardList, Star, Settings, Briefcase, GraduationCap, User as UserIcon } from 'lucide-react';
import { User } from '../lib/types';

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/staff', icon: Users, label: 'Daftar Staf' },
    { to: '/admin/absensi', icon: UserCheck, label: 'Absensi' },
    { to: '/admin/kpi', icon: FileText, label: 'Penilaian KPI' },
    { to: '/admin/laporan-tugas', icon: ClipboardList, label: 'Laporan Tugas' },
    { to: '/admin/tugas-staff', icon: FileText, label: 'Tugas Staff' },
    { to: '/admin/jabatan', icon: Briefcase, label: 'Data Jabatan' },
    { to: '/admin/settings', icon: Settings, label: 'Pengaturan' },
  ];

  const staffLinks = [
    { to: '/staff', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/staff/absensi', icon: UserCheck, label: 'Absensi' },
    { to: '/staff/kpi', icon: ClipboardList, label: 'KPI' },
    { to: '/staff/nilai-kpi', icon: Star, label: 'Penilaian KPI' },
    { to: '/staff/settings', icon: Settings, label: 'Pengaturan' },
  ];

  const links = user.role === 'admin' ? adminLinks : staffLinks;
  
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <aside className="w-16 bg-white text-slate-700 border-r border-slate-200 hidden md:flex flex-col flex-shrink-0 transition-all duration-300 fixed top-0 left-0 h-screen z-40">
      <div className="h-16 flex items-center justify-center border-b border-slate-200">
        <GraduationCap className="h-8 w-8 text-school-blue" />
      </div>
      
      <nav className="flex-1 py-4 px-2 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/staff' || link.to === '/admin'}
              title={link.label}
              className={({ isActive }) =>
                `flex items-center p-3 rounded-md text-sm font-medium transition-colors justify-center relative ${
                  isActive
                    ? 'bg-school-blue text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
            </NavLink>
          );
        })}
      </nav>
      
      <div className="p-2 border-t border-slate-200 relative">
        <div 
          className="flex items-center justify-center cursor-pointer transition-transform hover:scale-105" 
          title={user.name}
          onClick={() => setIsProfileOpen(!isProfileOpen)}
        >
          <div className="w-8 h-8 rounded-full bg-school-blue flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm">
            {userInitial}
          </div>
        </div>

        {/* Profile Dialog Modal (SBAGIAMU Concept) */}
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
                <div className="bg-slate-50 p-5 sm:p-6 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-6 items-start justify-between">
                  {/* Info list (left) */}
                  <div className="flex-1 space-y-4 w-full">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Nama Lengkap</p>
                      <p className="font-medium text-slate-900 text-base">{user.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Email</p>
                      <p className="font-medium text-slate-900 text-base">{user.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Peran</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-school-blue/10 text-school-blue capitalize">
                        {user.role}
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
                      onClick={() => {
                        setIsProfileOpen(false);
                        if (window.confirm('Apakah Anda yakin ingin keluar?')) {
                          onLogout();
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
    </aside>
  );
};
