import React, { useState, useEffect } from 'react';
import { User, Role, MasterJabatan } from '../../lib/types';
import { getUsers, updateStaffAssignment, getPositions, deleteUser } from '../../lib/db';
import { Users, Search, CheckCircle, Clock, ChevronDown, Check, Edit, Trash2, Settings } from 'lucide-react';
import { useRealtimeSubscription } from '../../lib/useRealtime';

export const AdminStaffList: React.FC = () => {
  const [staff, setStaff] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assignRole, setAssignRole] = useState<Role>('staff');
  const [assignPosition, setAssignPosition] = useState('');
  const [assignPhone, setAssignPhone] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [availablePositions, setAvailablePositions] = useState<MasterJabatan[]>([]);
  const [isPositionDropdownOpen, setIsPositionDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [assignIsApproved, setAssignIsApproved] = useState(false);

  const fetchStaff = async () => {
    const data = await getUsers();
    setStaff(data);
  };

  useEffect(() => {
    fetchStaff();
    getPositions().then(setAvailablePositions);
  }, []);

  useRealtimeSubscription(['profil_pengguna'], fetchStaff);

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.position || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAssignModal = (user: User) => {
    setSelectedUser(user);
    setAssignRole(user.role);
    setAssignPosition(user.position || '');
    setAssignPhone(user.phone || '');
    setAssignIsApproved(user.isApproved || false);
    setIsPositionDropdownOpen(false);
    setIsRoleDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleAssignSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSaving(true);
    try {
      await updateStaffAssignment(selectedUser.id, {
        role: assignRole,
        position: assignPosition,
        phone: assignPhone,
        isApproved: assignIsApproved
      });
      setIsModalOpen(false);
      fetchStaff(); // refresh data
    } catch (error) {
      alert("Terjadi kesalahan saat menyimpan penugasan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus staf ini? Semua data terkait akan hilang.")) {
      try {
        await deleteUser(userId);
        fetchStaff();
      } catch (error) {
        alert("Gagal menghapus staf. Pastikan tidak ada data yang terikat dengan pengguna ini.");
      }
    }
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 mb-1 sm:mb-2 tracking-tight">Daftar Staf & Guru</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg">Kelola dan lihat profil seluruh pegawai sekolah</p>
        </div>

        <div className="relative w-full md:w-72 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Cari nama atau jabatan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 pr-4 pl-10 text-slate-700 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center space-x-2 bg-white">
          <Users size={20} className="text-slate-600" />
          <h2 className="font-bold text-slate-800 text-lg">Data Staf & Guru</h2>
        </div>
        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="w-full text-left border-collapse min-w-[800px] hidden md:table">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold border border-slate-200 w-12 text-center">NO</th>
                <th className="px-4 py-3 font-bold border border-slate-200">NAMA LENGKAP</th>
                <th className="px-4 py-3 font-bold border border-slate-200">EMAIL</th>
                <th className="px-4 py-3 font-bold border border-slate-200">PROFESI / JABATAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center">NO TELP</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center">STATUS</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length > 0 ? (
                filteredStaff.map((user, index) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm font-medium text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm font-bold text-slate-800">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm text-slate-700">
                      {user.email || '-'}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm text-slate-700">
                      {user.position}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm text-slate-700">
                      {user.phone || '-'}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm">
                      {user.isApproved ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm">
                          <CheckCircle size={12} className="mr-1" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock size={12} className="mr-1" /> Menunggu
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openAssignModal(user)}
                          title={!user.isApproved ? 'Tugaskan' : 'Edit'}
                          className={`p-2 rounded-full transition-colors ${
                            !user.isApproved 
                              ? 'text-amber-500 hover:bg-amber-50 hover:text-amber-600' 
                              : 'text-school-blue hover:bg-blue-50 hover:text-blue-700'
                          }`}
                        >
                          {!user.isApproved ? <Settings size={18} /> : <Edit size={18} />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          title="Hapus"
                          className="p-2 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-2 text-slate-300">
                      <Users size={32} />
                    </div>
                    Tidak ada staf yang ditemukan berdasarkan pencarian Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y divide-slate-100">
            {filteredStaff.length > 0 ? (
              filteredStaff.map(user => (
                <div key={user.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <h3 className="font-extrabold text-slate-800 text-base">{user.name}</h3>
                      <p className="text-sm font-medium text-school-blue">{user.position}</p>
                    </div>
                    <div>
                      {user.isApproved ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm">
                          <CheckCircle size={12} className="mr-1" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock size={12} className="mr-1" /> Menunggu
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm flex flex-col gap-1.5 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Email</span>
                      <span className="font-semibold text-slate-700">{user.email || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">No Telp</span>
                      <span className="font-semibold text-slate-700">{user.phone || '-'}</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 flex justify-end gap-2 mt-1">
                    <button
                      onClick={() => openAssignModal(user)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${!user.isApproved ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-blue-50 text-school-blue hover:bg-blue-100'}`}
                    >
                      {!user.isApproved ? <><Settings size={16}/> Tugaskan</> : <><Edit size={16}/> Edit Profil</>}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="flex-none flex items-center justify-center px-3.5 py-2.5 rounded-xl text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                <div className="flex justify-center mb-2 text-slate-300">
                  <Users size={32} />
                </div>
                Tidak ada staf yang ditemukan berdasarkan pencarian Anda.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Penugasan */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl shrink-0">
              <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">Penugasan Staf</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignSave} className="p-6 space-y-5 overflow-y-visible">
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-1">Nama Staf / Guru</p>
                <p className="font-bold text-slate-800 text-lg">{selectedUser.name}</p>
              </div>

              <div className="relative">
                <label className="block text-sm font-bold text-slate-700 mb-2">Hak Akses Sistem</label>
                <div
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer hover:border-school-blue/50 transition-all"
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                >
                  <span className="font-medium">
                    {assignRole === 'admin' ? 'Admin / Manajemen' : 'Staf / Guru / Pegawai'}
                  </span>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {isRoleDropdownOpen && (
                  <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-auto py-2 animate-in fade-in slide-in-from-top-2">
                    <div
                      className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors"
                      onClick={() => {
                        setAssignRole('staff');
                        setIsRoleDropdownOpen(false);
                      }}
                    >
                      <span className={`font-medium ${assignRole === 'staff' ? 'text-school-blue' : 'text-slate-700'}`}>
                        Staf / Guru / Pegawai
                      </span>
                      {assignRole === 'staff' && <Check size={16} className="text-school-blue" />}
                    </div>
                    <div
                      className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors"
                      onClick={() => {
                        setAssignRole('admin');
                        setIsRoleDropdownOpen(false);
                      }}
                    >
                      <span className={`font-medium ${assignRole === 'admin' ? 'text-school-blue' : 'text-slate-700'}`}>
                        Admin / Manajemen
                      </span>
                      {assignRole === 'admin' && <Check size={16} className="text-school-blue" />}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-sm font-bold text-slate-700 mb-2">Jabatan Utama</label>
                <div
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer hover:border-school-blue/50 transition-all"
                  onClick={() => setIsPositionDropdownOpen(!isPositionDropdownOpen)}
                >
                  <span className={assignPosition ? 'font-medium' : 'text-slate-400'}>
                    {assignPosition || '-- Pilih Jabatan --'}
                  </span>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isPositionDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {isPositionDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-auto py-2 animate-in fade-in slide-in-from-top-2">
                    {availablePositions.map(pos => (
                      <div
                        key={pos.id}
                        className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors"
                        onClick={() => {
                          setAssignPosition(pos.nama_jabatan);
                          setIsPositionDropdownOpen(false);
                        }}
                      >
                        <span className={`font-medium ${assignPosition === pos.nama_jabatan ? 'text-school-blue' : 'text-slate-700'}`}>
                          {pos.nama_jabatan}
                        </span>
                        {assignPosition === pos.nama_jabatan && <Check size={16} className="text-school-blue" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Kontak / No Telp</label>
                <input
                  type="text"
                  value={assignPhone}
                  onChange={(e) => setAssignPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl px-4 py-3 focus:border-school-blue outline-none focus:ring-4 focus:ring-school-blue/10 transition-all"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-sm font-bold text-slate-700">Status Akun</label>
                  <p className="text-xs text-slate-500 mt-0.5">Tentukan apakah akun ini aktif dan bisa login.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={assignIsApproved}
                  onClick={() => setAssignIsApproved(!assignIsApproved)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-school-blue focus:ring-offset-2 ${
                    assignIsApproved ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      assignIsApproved ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 rounded-xl bg-school-blue text-white font-bold hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 flex justify-center items-center"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan & Aktifkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
