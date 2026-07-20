import React from 'react';
import { User } from '../../lib/types';
import { Shield, Bell, Smartphone } from 'lucide-react';

interface SettingsProps {
  user: User;
}

export const Settings: React.FC<SettingsProps> = ({ user }) => {
  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-800 mb-2 tracking-tight">Pengaturan</h1>
        <p className="text-slate-500 text-lg">Kelola profil, keamanan, dan preferensi aplikasi</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
        <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center">
          <Shield className="mr-2 text-school-blue" size={20} />
          Profil & Keamanan
        </h3>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lengkap</label>
              <input 
                type="text" 
                value={user.name} 
                disabled 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-500 font-medium cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">ID Karyawan</label>
              <input 
                type="text" 
                value={user.id} 
                disabled 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-500 font-medium cursor-not-allowed"
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100">
            <button className="bg-white border-2 border-slate-200 hover:border-school-blue hover:text-school-blue text-slate-700 py-3 px-6 rounded-xl font-bold transition-all shadow-sm">
              Ubah Kata Sandi
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
        <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center">
          <Bell className="mr-2 text-school-blue" size={20} />
          Notifikasi
        </h3>
        
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors">
            <div>
              <p className="font-bold text-slate-800">Notifikasi Kehadiran</p>
              <p className="text-sm text-slate-500">Kirim pengingat absen masuk dan keluar.</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 accent-school-blue" />
          </label>
          <label className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors">
            <div>
              <p className="font-bold text-slate-800">Laporan Tugas</p>
              <p className="text-sm text-slate-500">Pemberitahuan terkait jurnal mengajar dan buku saku.</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 accent-school-blue" />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
        <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center">
          <Smartphone className="mr-2 text-school-blue" size={20} />
          Tampilan Aplikasi
        </h3>
        
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors">
            <div>
              <p className="font-bold text-slate-800">Mode Gelap (Dark Mode)</p>
              <p className="text-sm text-slate-500">Ubah tema aplikasi menjadi gelap (Segera Hadir).</p>
            </div>
            <input type="checkbox" disabled className="w-5 h-5 accent-school-blue cursor-not-allowed" />
          </label>
        </div>
      </div>
    </div>
  );
};
