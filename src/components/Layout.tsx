import React from 'react';
import { Sidebar } from './Sidebar';
import { BottomNavigation } from './BottomNavigation';
import { User } from '../lib/types';
import { Navigate, Outlet } from 'react-router-dom';

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
  allowedRole?: 'admin' | 'staff';
}

export const Layout: React.FC<LayoutProps> = ({ user, onLogout, allowedRole }) => {
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/staff'} replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar 
        user={user} 
        onLogout={onLogout} 
      />
      
      <div className="flex-1 flex flex-col w-full h-full transition-all duration-300 md:ml-16">
        <div id="main-scroll-container" className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
          <Outlet />
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation user={user} onLogout={onLogout} />
    </div>
  );
};
