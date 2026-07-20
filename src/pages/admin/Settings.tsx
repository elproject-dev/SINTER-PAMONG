import React, { useState, useEffect } from 'react';
import { User, SchoolSettings } from '../../lib/types';
import { getSchoolSettings, saveSchoolSettings } from '../../lib/db';
import { Shield, Bell, Smartphone, MapPin, Save, Map } from 'lucide-react';

interface AdminSettingsProps {
  user: User;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ user }) => {
  const [gpsSettings, setGpsSettings] = useState<SchoolSettings>({ latitude: 0, longitude: 0, maxRadius: 100 });
  const [coordsInput, setCoordsInput] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const settings = await getSchoolSettings();
      setGpsSettings(settings);
      setCoordsInput(`${settings.latitude}, ${settings.longitude}`);
    };
    fetchSettings();
  }, []);

  const handleCoordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCoordsInput(val);
    const parts = val.split(',');
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0].trim());
      const lon = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lon)) {
        setGpsSettings(prev => ({...prev, latitude: lat, longitude: lon}));
      }
    }
  };

  const handleSaveGps = async () => {
    await saveSchoolSettings(gpsSettings);
    alert('Pengaturan GPS berhasil disimpan!');
  };

  const handleGetCurrentLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert('Browser tidak mendukung GPS');
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsSettings(prev => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }));
        setCoordsInput(`${pos.coords.latitude}, ${pos.coords.longitude}`);
        setIsLocating(false);
      },
      (err) => {
        alert('Gagal mengambil lokasi: ' + err.message);
        setIsLocating(false);
      }
    );
  };

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 mb-1 sm:mb-2 tracking-tight">Pengaturan Admin</h1>
        <p className="text-slate-500 text-sm sm:text-base lg:text-lg">Kelola profil, preferensi GPS, dan sistem aplikasi</p>
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
              <label className="block text-sm font-bold text-slate-700 mb-2">ID Admin</label>
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
          <Map className="mr-2 text-school-blue" size={20} />
          Pengaturan Lokasi Absensi (GPS)
        </h3>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Koordinat (Latitude, Longitude)</label>
              <input 
                type="text"
                value={coordsInput}
                onChange={handleCoordChange}
                placeholder="Contoh: -6.1751, 106.8271"
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-school-blue focus:border-school-blue outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Radius Maksimal (Meter)</label>
              <input 
                type="number"
                value={gpsSettings.maxRadius}
                onChange={e => setGpsSettings({...gpsSettings, maxRadius: parseInt(e.target.value) || 100})}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-school-blue focus:border-school-blue outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-4">
            <button 
              onClick={handleGetCurrentLocation}
              disabled={isLocating}
              className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-3 px-6 rounded-xl font-bold transition-all flex items-center shadow-sm disabled:opacity-50"
            >
              <MapPin size={18} className="mr-2" />
              {isLocating ? 'Mencari...' : 'Ambil Lokasi Saya Saat Ini'}
            </button>
            <button 
              onClick={handleSaveGps}
              className="bg-school-blue text-white hover:bg-blue-800 py-3 px-6 rounded-xl font-bold transition-all flex items-center shadow-sm"
            >
              <Save size={18} className="mr-2" />
              Simpan Pengaturan GPS
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
        <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center">
          <Bell className="mr-2 text-school-blue" size={20} />
          Notifikasi Sistem
        </h3>
        
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors">
            <div>
              <p className="font-bold text-slate-800">Laporan Kehadiran Harian</p>
              <p className="text-sm text-slate-500">Terima ringkasan absensi seluruh staf setiap hari.</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 accent-school-blue" />
          </label>
          <label className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors">
            <div>
              <p className="font-bold text-slate-800">Penilaian KPI Baru</p>
              <p className="text-sm text-slate-500">Pemberitahuan saat data KPI baru ditambahkan atau diperbarui.</p>
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
