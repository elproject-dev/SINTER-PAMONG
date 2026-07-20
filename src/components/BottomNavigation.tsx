import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, UserCheck, FileText, 
  Briefcase, Settings, Menu, LogOut, ClipboardList, Star
} from 'lucide-react';
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

  const mainLinks = useMemo(() => {
    if (isAdmin) {
      return [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/staff", label: "Staf", icon: Users },
        { href: "/admin/absensi", label: "Absensi", icon: UserCheck },
        { href: "/admin/kpi", label: "KPI", icon: FileText },
      ];
    }
    return [
      { href: "/staff", label: "Dashboard", icon: LayoutDashboard },
      { href: "/staff/absensi", label: "Absensi", icon: UserCheck },
      { href: "/staff/kpi", label: "KPI", icon: ClipboardList },
      { href: "/staff/nilai-kpi", label: "Nilai KPI", icon: Star },
    ];
  }, [isAdmin]);

  const moreLinks = useMemo(() => {
    if (isAdmin) {
      return [
        { href: "/admin/jabatan", label: "Jabatan", icon: Briefcase },
        { href: "/admin/settings", label: "Pengaturan", icon: Settings },
        { href: "#logout", label: "Keluar", icon: LogOut, isLogout: true },
      ];
    }
    return [
      { href: "/staff/settings", label: "Pengaturan", icon: Settings },
      { href: "#logout", label: "Keluar", icon: LogOut, isLogout: true },
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
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowMore(false)}
        />
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-50 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] transition-all duration-300 rounded-t-2xl">
        <div className="flex items-center justify-around py-2 px-1 relative z-10 bg-white rounded-t-2xl">
          {mainLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all duration-200 relative ${
                  isActive
                    ? "text-school-blue"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? "text-school-blue" : "text-slate-400"}`} />
                <span className={`text-[9px] font-medium text-center leading-tight ${
                  isActive ? "text-school-blue font-bold" : "text-slate-400"
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
                ? "text-school-blue"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Menu className="w-5 h-5 mb-1" />
            <span className={`text-[9px] font-medium text-center leading-tight ${
              showMore ? "text-school-blue font-bold" : "text-slate-400"
            }`}>
              Lainnya
            </span>
          </button>
        </div>

        <div className={`grid transition-all duration-300 ease-in-out bg-white ${
          showMore ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}>
          <div className="overflow-hidden">
            <div className="flex items-center justify-around py-3 px-1 flex-wrap gap-y-3 border-t border-slate-100">
              {moreLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.href;
                const isLogout = "isLogout" in link && link.isLogout;

                if (isLogout) {
                  return (
                    <button
                      key={link.href}
                      onClick={handleLogout}
                      className="flex flex-col items-center justify-center w-16 py-1 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Icon className="w-5 h-5 mb-1" />
                      <span className="text-[9px] font-medium text-center leading-tight text-red-500">{link.label}</span>
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
                        ? "text-school-blue"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1 ${isActive ? "text-school-blue" : "text-slate-400"}`} />
                    <span className={`text-[9px] font-medium text-center leading-tight ${
                      isActive ? "text-school-blue font-bold" : "text-slate-400"
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
