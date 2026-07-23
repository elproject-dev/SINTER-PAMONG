import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserCheck, FileText, ClipboardList, Settings, GraduationCap, Calendar } from 'lucide-react';
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

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/absensi', icon: UserCheck, label: 'Absensi' },
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
    { to: '/staff/absensi', icon: UserCheck, label: 'Absensi' },
    { to: '/staff/daftar-tugas', icon: ClipboardList, label: 'Daftar Tugas' },
    { to: '/staff/nilai-kpi', icon: BiCheckSquare, label: 'Penilaian KPI' },
    { to: '/staff/jadwal-guru', icon: Calendar, label: 'Jadwal Guru' },
    { to: '/staff/buku-saku', icon: BiBookBookmark, label: 'Buku Saku' },
    { to: '/staff/settings', icon: Settings, label: 'Pengaturan' },
  ];

  const links = user.role === 'admin' ? adminLinks : staffLinks;

  return (
    <aside className="w-16 bg-white text-slate-700 border-r border-slate-200 hidden xl:flex flex-col flex-shrink-0 transition-all duration-300 fixed top-0 left-0 h-screen z-40">
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
                `flex items-center p-3 rounded-md text-sm font-medium transition-colors justify-center relative ${isActive
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
          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
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
