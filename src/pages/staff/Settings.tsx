import React, { useState, useEffect } from 'react';
import { User } from '../../lib/types';
import { Shield, Bell, Smartphone } from 'lucide-react';
import { updateUserProfileName, updateUserPassword } from '../../lib/db';

interface SettingsProps {
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onUserUpdate }) => {
  const [nameInput, setNameInput] = useState(user.name);
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setNameInput(user.name);
  }, [user.name]);

  const handleSaveProfile = async () => {
    if (!nameInput.trim()) {
      alert('Nama lengkap tidak boleh kosong');
      return;
    }

    if (passwordInput) {
      if (passwordInput.length < 6) {
        alert('Kata sandi minimal harus 6 karakter');
        return;
      }
      if (passwordInput !== confirmPasswordInput) {
        alert('Konfirmasi kata sandi tidak cocok');
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      // 1. Update Name if changed
      if (nameInput !== user.name) {
        await updateUserProfileName(user.id, nameInput);
        if (onUserUpdate) {
          onUserUpdate({ ...user, name: nameInput });
        }
      }

      // 2. Update Password if entered
      if (passwordInput) {
        await updateUserPassword(passwordInput);
        setPasswordInput('');
        setConfirmPasswordInput('');
      }

      alert('Profil dan keamanan berhasil diperbarui!');
    } catch (err: any) {
      alert('Gagal memperbarui: ' + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 tracking-tight mb-1 sm:mb-2">Pengaturan</h1>
        <p className="text-slate-500 text-sm sm:text-base lg:text-lg">Kelola profil, keamanan, dan preferensi aplikasi</p>
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
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-700 text-sm focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">ID Karyawan</label>
              <input
                type="text"
                value={user.id ? (user.id.includes('-') ? user.id.split('-')[0] : user.id.slice(0, 8)) : ''}
                disabled
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-500 text-sm font-medium cursor-not-allowed shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Kata Sandi Baru</label>
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Kosongkan jika tidak ingin diubah"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-700 text-sm focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Konfirmasi Kata Sandi Baru</label>
              <input
                type="password"
                value={confirmPasswordInput}
                onChange={e => setConfirmPasswordInput(e.target.value)}
                placeholder="Kosongkan jika tidak ingin diubah"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-700 text-sm focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-4">
            <button
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="px-8 py-2 border border-transparent bg-gradient-to-r from-school-blue to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center disabled:opacity-50 whitespace-nowrap"
            >
              {isSavingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
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
              <p className="text-sm text-slate-500">Pemberitahuan terkait jurnal mengajar</p>
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
