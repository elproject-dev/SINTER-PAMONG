import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, 
  Settings, Menu, LogOut, ClipboardList, Calendar
} from 'lucide-react';
import { BiBookBookmark, BiCheckSquare } from "react-icons/bi";
import { User } from '../lib/types';

interface BottomNavigationProps {
  user: User;
  onLogout: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);

  const isAdmin = user.role === 'admin';

  const CustomAbsensiIcon = ({ size = 20, className = "" }: { size?: number | string, className?: string }) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className={className} height={size} width={size} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="4" r="2"></circle>
      <path d="M12 18h2v-5h2V9c0-1.103-.897-2-2-2h-4c-1.103 0-2 .897-2 2v4h2v5h2z"></path>
      <path d="m18.446 11.386-.893 1.789C19.108 13.95 20 14.98 20 16c0 1.892-3.285 4-8 4s-8-2.108-8-4c0-1.02.892-2.05 2.446-2.825l-.893-1.789C3.295 12.512 2 14.193 2 16c0 3.364 4.393 6 10 6s10-2.636 10-6c0-1.807-1.295-3.488-3.554-4.614z"></path>
    </svg>
  );

  const mainLinks = useMemo(() => {
    if (isAdmin) {
      return [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/absensi", label: "Absensi", icon: CustomAbsensiIcon },
        { href: "/admin/tugas-staff", label: "Tugas", icon: FileText },
        { href: "/admin/penilaian-tugas", label: "Penilaian", icon: ClipboardList },
      ];
    }
    return [
      { href: "/staff", label: "Dashboard", icon: LayoutDashboard },
      { href: "/staff/absensi", label: "Absensi", icon: CustomAbsensiIcon },
      { href: "/staff/daftar-tugas", label: "Tugas", icon: ClipboardList },
      { href: "/staff/nilai-kpi", label: "KPI", icon: BiCheckSquare },
    ];
  }, [isAdmin]);

  const moreLinks = useMemo(() => {
    if (isAdmin) {
      return [
        { href: "/admin/staff", label: "Daftar Staf", icon: Users },
        { href: "/admin/kpi", label: "KPI", icon: BiCheckSquare },
        { href: "/admin/jadwal-guru", label: "Jadwal", icon: Calendar },
        { href: "/admin/buku-saku", label: "Buku Saku", icon: BiBookBookmark },
        { href: "/admin/settings", label: "Pengaturan", icon: Settings },
      ];
    }
    return [
      { href: "/staff/buku-saku", label: "Buku Saku", icon: BiBookBookmark },
      { href: "/staff/jadwal-guru", label: "Jadwal", icon: Calendar },
      { href: "/staff/settings", label: "Pengaturan", icon: Settings },
      { href: "#logout", label: "Keluar", icon: LogOut, isLogout: true },
      { href: "#empty", label: "", icon: () => null, isEmpty: true },
    ];
  }, [isAdmin]);

  const handleLogout = () => {
    setShowMore(false);
    onLogout();
    navigate('/');
  };

  return (
    <>
      {showMore && (
        <div
          className="fixed inset-0 bg-black/50 z-40 xl:hidden"
          onClick={() => setShowMore(false)}
        />
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 xl:hidden z-50 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] transition-all duration-300 rounded-t-2xl">
        <div className="flex items-center justify-around py-2 px-1 relative z-10 bg-white dark:bg-slate-800 rounded-t-2xl">
          {mainLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all duration-200 relative ${
                  isActive
                    ? "text-school-blue dark:text-white"
                    : "text-slate-400 hover:text-slate-600 dark:text-slate-300"
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? "text-school-blue dark:text-white" : "text-slate-400"}`} />
                <span className={`text-[9px] font-medium text-center leading-tight ${
                  isActive ? "text-school-blue dark:text-white font-bold" : "text-slate-400"
                }`}>
                  {link.label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all duration-200 ${
              showMore
                ? "text-school-blue dark:text-white"
                : "text-slate-400 hover:text-slate-600 dark:text-slate-300"
            }`}
          >
            <Menu className="w-5 h-5 mb-1" />
            <span className={`text-[9px] font-medium text-center leading-tight ${
              showMore ? "text-school-blue dark:text-white font-bold" : "text-slate-400"
            }`}>
              Lainnya
            </span>
          </button>
        </div>

        <div className={`grid transition-all duration-300 ease-in-out bg-white dark:bg-slate-800 ${
          showMore ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}>
          <div className="overflow-hidden">
            <div className="flex items-center justify-around py-3 px-1 flex-wrap gap-y-3 border-t border-slate-100 dark:border-slate-700">
              {moreLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.href;
                const isLogout = "isLogout" in link && link.isLogout;
                const isEmpty = "isEmpty" in link && link.isEmpty;

                if (isEmpty) {
                  return <div key={link.href} className="w-16 py-1"></div>;
                }

                if (isLogout) {
                  return (
                    <button
                      key={link.href}
                      onClick={handleLogout}
                      className="flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all duration-200 text-slate-400 hover:text-slate-600 dark:text-slate-300"
                    >
                      <Icon className="w-5 h-5 mb-1 text-slate-400" />
                      <span className="text-[9px] font-medium text-center leading-tight text-slate-400">{link.label}</span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setShowMore(false)}
                    className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "text-school-blue dark:text-white"
                        : "text-slate-400 hover:text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1 ${isActive ? "text-school-blue dark:text-white" : "text-slate-400"}`} />
                    <span className={`text-[9px] font-medium text-center leading-tight ${
                      isActive ? "text-school-blue dark:text-white font-bold" : "text-slate-400"
                    }`}>
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
















