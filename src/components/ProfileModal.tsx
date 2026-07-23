import React, { useRef } from 'react';
import { User as UserIcon, X, Camera, Loader2, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User } from '../lib/types';

interface ProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  profilePic: string | null;
  isUploadingPic: boolean;
  onProfilePicChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogout?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  profilePic,
  isUploadingPic,
  onProfilePicChange,
  onLogout
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleLogout = async () => {
    onClose();
    if (window.confirm('Apakah Anda yakin ingin keluar?')) {
      if (onLogout) {
        onLogout();
      } else {
        await supabase.auth.signOut();
        localStorage.removeItem('hr_current_user');
        window.location.href = import.meta.env.BASE_URL || '/';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Dialog Content */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-[90%] max-w-2xl max-h-[90vh] overflow-y-auto relative z-10 animate-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-school-blue/10 rounded-full flex items-center justify-center text-school-blue dark:text-white shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-50">Profil Pengguna</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors"
              title="Tutup Popup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="bg-slate-50 dark:bg-slate-900 p-5 sm:p-6 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-6 items-start justify-between text-left">
            {/* Info list (left) */}
            <div className="flex-1 space-y-4 w-full">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">Nama Lengkap</p>
                <p className="font-medium text-slate-900 text-base">{user.name || 'Admin'}</p>
              </div>
              
              {user.email && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">Email</p>
                  <p className="font-medium text-slate-900 text-base">{user.email}</p>
                </div>
              )}
              
              <div className="flex flex-col items-start">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">Peran</p>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-school-blue dark:bg-blue-600 text-white capitalize shadow-sm -ml-2.5">
                  {user.jobRoles && user.jobRoles.length > 0 ? user.jobRoles.join(', ') : user.role}
                </span>
              </div>

              {user.role !== 'admin' && (
                <div className="flex flex-col items-start">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">Jabatan Utama</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize shadow-sm -ml-2.5 ${user.position && user.position !== 'Belum Ditugaskan' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600 dark:text-slate-300'}`}>
                    {user.position || 'Belum Ditugaskan'}
                  </span>
                </div>
              )}
            </div>

            {/* Avatar & Actions (right) */}
            <div className="flex flex-col items-center gap-3 shrink-0 w-full sm:w-auto">
              <div className="relative group w-20 h-20 rounded-full border-4 border-white shadow-md bg-slate-200 flex items-center justify-center overflow-hidden">
                <img src={profilePic || `${import.meta.env.BASE_URL}check.png`} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `${import.meta.env.BASE_URL}check.png`; }} />

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
                  onChange={onProfilePicChange}
                />
              </div>
              
              <button
                onClick={handleLogout}
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
  );
};
















