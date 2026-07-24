import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, ClipboardList, Settings, GraduationCap, Calendar } from 'lucide-react';
import { BiBookBookmark, BiCheckSquare } from "react-icons/bi";

import { User } from '../lib/types';
import { useProfilePic } from '../hooks/useProfilePic';
import { ProfileModal } from './ProfileModal';

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const {
    profilePic,
    isUploadingPic,
    isProfileOpen,
    setIsProfileOpen,
    handleProfilePicChange
  } = useProfilePic(user.id, user.name);

  const CustomAbsensiIcon = ({ size = 24, className = "" }: { size?: number | string, className?: string }) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className={className} height={size} width={size} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="4" r="2"></circle>
      <path d="M12 18h2v-5h2V9c0-1.103-.897-2-2-2h-4c-1.103 0-2 .897-2 2v4h2v5h2z"></path>
      <path d="m18.446 11.386-.893 1.789C19.108 13.95 20 14.98 20 16c0 1.892-3.285 4-8 4s-8-2.108-8-4c0-1.02.892-2.05 2.446-2.825l-.893-1.789C3.295 12.512 2 14.193 2 16c0 3.364 4.393 6 10 6s10-2.636 10-6c0-1.807-1.295-3.488-3.554-4.614z"></path>
    </svg>
  );

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/absensi', icon: CustomAbsensiIcon, label: 'Absensi' },
    { to: '/admin/tugas-staff', icon: FileText, label: 'Tugas Staff' },
    { to: '/admin/penilaian-tugas', icon: ClipboardList, label: 'Penilaian Tugas' },
    { to: '/admin/staff', icon: Users, label: 'Daftar Staf' },
    { to: '/admin/kpi', icon: BiCheckSquare, label: 'Penilaian KPI' },
    { to: '/admin/jadwal-guru', icon: Calendar, label: 'Jadwal Guru' },
    { to: '/admin/buku-saku', icon: BiBookBookmark, label: 'Buku Saku' },
    { to: '/admin/settings', icon: Settings, label: 'Pengaturan' },
  ];

  const staffLinks = [
    { to: '/staff', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/staff/absensi', icon: CustomAbsensiIcon, label: 'Absensi' },
    { to: '/staff/daftar-tugas', icon: ClipboardList, label: 'Daftar Tugas' },
    { to: '/staff/nilai-kpi', icon: BiCheckSquare, label: 'Penilaian KPI' },
    { to: '/staff/jadwal-guru', icon: Calendar, label: 'Jadwal Guru' },
    { to: '/staff/buku-saku', icon: BiBookBookmark, label: 'Buku Saku' },
    { to: '/staff/settings', icon: Settings, label: 'Pengaturan' },
  ];

  const links = user.role === 'admin' ? adminLinks : staffLinks;

  return (
    <aside className="w-16 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 hidden xl:flex flex-col flex-shrink-0 transition-all duration-300 fixed top-0 left-0 h-screen z-40">
      <div className="h-16 flex items-center justify-center border-b border-slate-200 dark:border-slate-700">
        <GraduationCap className="h-8 w-8 text-school-blue dark:text-white" />
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
                `flex items-center p-3 rounded-md text-sm font-medium transition-colors justify-center relative ${isActive
                  ? 'bg-school-blue dark:bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
            </NavLink>
          );
        })}
      </nav>

      <div className="p-2 border-t border-slate-200 dark:border-slate-700 relative">
        <div
          className="flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
          title={user.name}
          onClick={() => setIsProfileOpen(!isProfileOpen)}
        >
          <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
            <img src={profilePic || `${import.meta.env.BASE_URL}check.png`} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `${import.meta.env.BASE_URL}check.png`; }} />
          </div>
        </div>

        <ProfileModal
          user={user}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          profilePic={profilePic}
          isUploadingPic={isUploadingPic}
          onProfilePicChange={handleProfilePicChange}
          onLogout={onLogout}
        />
      </div>
    </aside>
  );
};
















