import React, { useState, useEffect } from 'react';
import { User, Role, MasterJabatan } from '../../lib/types';
import { getUsers, updateStaffAssignment, getPositions, deleteUser, addPosition, deletePosition, updatePosition } from '../../lib/db';
import { Users, Search, CheckCircle, Clock, ChevronDown, Check, Edit, Trash2, Settings, Plus, Briefcase, X, Loader2 } from 'lucide-react';
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

  // Jabatan Form state
  const [showJabatanForm, setShowJabatanForm] = useState(false);
  const [newJabatanName, setNewJabatanName] = useState('');
  const [isAddingJabatan, setIsAddingJabatan] = useState(false);
  
  // Jabatan Edit state
  const [editingJabatanId, setEditingJabatanId] = useState<string | null>(null);
  const [editJabatanName, setEditJabatanName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchStaff = async () => {
    const data = await getUsers();
    setStaff(data);
  };

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        await fetchStaff();
        const positions = await getPositions();
        setAvailablePositions(positions);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
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
    
    // Scroll to the top of the main scroll container, or window as fallback
    const scrollContainer = document.getElementById('main-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

  const handleAddJabatan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJabatanName.trim()) return;
    
    setIsAddingJabatan(true);
    try {
      await addPosition(newJabatanName.trim());
      setNewJabatanName('');
      setShowJabatanForm(false);
      const updatedPositions = await getPositions();
      setAvailablePositions(updatedPositions);
      alert('Jabatan berhasil ditambahkan!');
    } catch (error) {
      alert('Gagal menambahkan jabatan. Mungkin nama jabatan sudah ada.');
    } finally {
      setIsAddingJabatan(false);
    }
  };

  const handleDeleteJabatan = async (id: string) => {
    if (!confirm('Yakin ingin menghapus jabatan ini? Pastikan tidak ada staf yang menggunakannya.')) return;
    try {
      await deletePosition(id);
      const updatedPositions = await getPositions();
      setAvailablePositions(updatedPositions);
    } catch (error) {
      alert('Gagal menghapus jabatan.');
    }
  };

  const handleUpdateJabatan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJabatanId || !editJabatanName.trim()) return;
    setIsSavingEdit(true);
    try {
      await updatePosition(editingJabatanId, editJabatanName.trim());
      setEditingJabatanId(null);
      setEditJabatanName('');
      const updatedPositions = await getPositions();
      setAvailablePositions(updatedPositions);
    } catch (error) {
      alert('Gagal menyimpan perubahan jabatan.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 dark:text-slate-50 mb-1 sm:mb-2 tracking-tight">Daftar Staf & Guru</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base lg:text-lg">Kelola dan lihat profil seluruh pegawai sekolah</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0 bg-white dark:bg-slate-800 md:bg-transparent p-4 md:p-0 rounded-2xl md:rounded-none shadow-sm md:shadow-none border border-slate-100 dark:border-slate-700 md:border-none">
          <div className="relative w-full sm:w-64 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Cari nama atau jabatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pr-4 pl-10 text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium text-sm"
            />
          </div>

          <button
            onClick={() => {
              setShowJabatanForm(!showJabatanForm);
              if (!showJabatanForm) setNewJabatanName('');
            }}
            className={`px-6 py-2 text-white font-bold border border-transparent rounded-xl transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 whitespace-nowrap ${showJabatanForm
              ? 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700'
              : 'bg-gradient-to-r from-school-blue to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              }`}
          >
            {showJabatanForm ? 'Tutup Form' : <><Plus size={18} /> <span>Tambah Jabatan</span></>}
          </button>
        </div>
      </div>

      {/* Form Tambah Jabatan */}
      {showJabatanForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-in slide-in-from-top-4 fade-in duration-300">
          <h2 className="font-bold text-slate-800 dark:text-slate-50 text-lg mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <Plus size={20} className="text-school-blue dark:text-white" />
            Tambah Jabatan Baru
          </h2>

          <form onSubmit={handleAddJabatan} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full space-y-1">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Nama Jabatan <span className="text-rose-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Briefcase size={18} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Guru Matematika"
                  value={newJabatanName}
                  onChange={(e) => setNewJabatanName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pr-4 pl-10 text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium text-sm"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isAddingJabatan || !newJabatanName.trim()}
              className="w-full sm:w-auto px-6 py-2 text-white font-bold border border-transparent rounded-xl transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 whitespace-nowrap bg-gradient-to-r from-school-blue to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isAddingJabatan ? 'Menyimpan...' : 'Simpan Jabatan'}
            </button>
          </form>

          {/* Daftar Jabatan Saat Ini */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-50 text-sm mb-3">Daftar Jabatan Saat Ini</h3>
            {availablePositions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availablePositions.map(pos => (
                  <div key={pos.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-white dark:bg-slate-800 hover:shadow-sm transition-all group">
                    {editingJabatanId === pos.id ? (
                      <form onSubmit={handleUpdateJabatan} className="flex flex-1 items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          required
                          value={editJabatanName}
                          onChange={(e) => setEditJabatanName(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-school-blue rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-school-blue/20"
                        />
                        <button
                          type="submit"
                          disabled={isSavingEdit || !editJabatanName.trim()}
                          className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingJabatanId(null); setEditJabatanName(''); }}
                          className="p-1.5 rounded-lg bg-slate-200 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate pr-2">{pos.nama_jabatan}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingJabatanId(pos.id); setEditJabatanName(pos.nama_jabatan); }}
                            className="p-1.5 rounded-lg text-school-blue dark:text-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                            title="Edit Jabatan"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteJabatan(pos.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/50 transition-colors"
                            title="Hapus Jabatan"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">Belum ada jabatan yang ditambahkan.</p>
            )}
          </div>
        </div>
      )}

      {/* Form Penugasan Inline */}
      {isModalOpen && selectedUser && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-start justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-3 gap-3">
            <h2 className="font-bold text-slate-800 dark:text-slate-50 text-base sm:text-lg flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-1 min-w-0">
              <span className="leading-tight">
                Penugasan / Edit Profil
              </span>
              <span className="text-school-blue dark:text-white sm:text-slate-800 dark:text-slate-50 leading-tight">
                {selectedUser.name}
              </span>
            </h2>
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 shrink-0 -mt-1 sm:mt-0"
              title="Tutup Form"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleAssignSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="relative">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Hak Akses Sistem <span className="text-rose-500">*</span></label>
                <div
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-50 rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer hover:border-school-blue/50 transition-all"
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                >
                  <span className="font-medium text-sm">
                    {assignRole === 'admin' ? 'Admin / Manajemen' : 'Staf / Guru / Pegawai'}
                  </span>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {isRoleDropdownOpen && (
                  <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-56 overflow-auto py-2 animate-in fade-in slide-in-from-top-2">
                    <div
                      className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center transition-colors"
                      onClick={() => {
                        setAssignRole('staff');
                        setIsRoleDropdownOpen(false);
                      }}
                    >
                      <span className={`font-medium text-sm ${assignRole === 'staff' ? 'text-school-blue dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                        Staf / Guru / Pegawai
                      </span>
                      {assignRole === 'staff' && <Check size={16} className="text-school-blue dark:text-white" />}
                    </div>
                    <div
                      className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center transition-colors"
                      onClick={() => {
                        setAssignRole('admin');
                        setIsRoleDropdownOpen(false);
                      }}
                    >
                      <span className={`font-medium text-sm ${assignRole === 'admin' ? 'text-school-blue dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                        Admin / Manajemen
                      </span>
                      {assignRole === 'admin' && <Check size={16} className="text-school-blue dark:text-white" />}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Jabatan Utama</label>
                <div
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-50 rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer hover:border-school-blue/50 transition-all"
                  onClick={() => setIsPositionDropdownOpen(!isPositionDropdownOpen)}
                >
                  <span className={`text-sm ${assignPosition ? 'font-medium' : 'text-slate-400'}`}>
                    {assignPosition || '-- Pilih Jabatan --'}
                  </span>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isPositionDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {isPositionDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-56 overflow-auto py-2 animate-in fade-in slide-in-from-top-2">
                    {availablePositions.map(pos => (
                      <div
                        key={pos.id}
                        className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center transition-colors"
                        onClick={() => {
                          setAssignPosition(pos.nama_jabatan);
                          setIsPositionDropdownOpen(false);
                        }}
                      >
                        <span className={`font-medium text-sm ${assignPosition === pos.nama_jabatan ? 'text-school-blue dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                          {pos.nama_jabatan}
                        </span>
                        {assignPosition === pos.nama_jabatan && <Check size={16} className="text-school-blue dark:text-white" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Kontak / No Telp</label>
                <input
                  type="text"
                  value={assignPhone}
                  onChange={(e) => setAssignPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-50 placeholder:text-slate-400 rounded-xl px-4 py-3 focus:border-school-blue outline-none focus:ring-4 focus:ring-school-blue/10 transition-all text-sm font-medium"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">Status Akun</label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Berikan akses masuk ke sistem.</p>
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
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-800 shadow ring-0 transition duration-200 ease-in-out ${
                      assignIsApproved ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 mt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto px-6 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:text-slate-200 hover:border-slate-300 transition-all text-sm flex items-center justify-center gap-2"
              >
                <X size={18} /> Tutup Form
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-2 rounded-xl text-white font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm bg-gradient-to-r from-school-blue to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isSaving ? (
                  <><Loader2 size={18} className="animate-spin" /> Menyimpan...</>
                ) : (
                  <><CheckCircle size={18} /> Simpan Perubahan</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center space-x-2 bg-white dark:bg-slate-800">
          <Users size={20} className="text-slate-600 dark:text-slate-300" />
          <h2 className="font-bold text-slate-800 dark:text-slate-50 text-lg">Data Staf & Guru</h2>
        </div>
        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="w-full text-left border-collapse min-w-[800px] hidden lg:table">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 w-12 text-center">NO</th>
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700">NAMA LENGKAP</th>
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700">EMAIL</th>
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700">PROFESI / JABATAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700">NO TELP</th>
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center">STATUS</th>
                <th className="px-4 py-3 font-bold border border-slate-200 dark:border-slate-700 text-center w-24">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-center mb-3 text-school-blue dark:text-white">
                      <Loader2 size={32} className="animate-spin" />
                    </div>
                    <p className="font-bold text-lg text-slate-600 dark:text-slate-300 mb-1">Memuat Data...</p>
                  </td>
                </tr>
              ) : filteredStaff.length > 0 ? (
                filteredStaff.map((user, index) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-50">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200">
                      {user.email || '-'}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200">
                      {user.position}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200">
                      {user.phone || '-'}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-center text-sm">
                      {user.isApproved ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm border border-emerald-600">
                          <CheckCircle size={12} className="mr-1" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white shadow-sm border border-orange-600">
                          <Clock size={12} className="mr-1" /> Menunggu
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openAssignModal(user)}
                          title={!user.isApproved ? 'Tugaskan' : 'Edit'}
                          className={`p-2 rounded-full transition-colors ${
                            !user.isApproved 
                              ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/50 hover:text-amber-600' 
                              : 'text-school-blue dark:text-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-slate-300'
                          }`}
                        >
                          {!user.isApproved ? <Settings size={18} /> : <Edit size={18} />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          title="Hapus"
                          className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
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
          <div className="lg:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <div className="flex justify-center mb-3 text-school-blue dark:text-white">
                  <Loader2 size={32} className="animate-spin" />
                </div>
                <p className="font-bold text-lg text-slate-600 dark:text-slate-300 mb-1">Memuat Data...</p>
              </div>
            ) : filteredStaff.length > 0 ? (
              filteredStaff.map(user => (
                <div key={user.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <h3 className="font-extrabold text-slate-800 dark:text-slate-50 text-base">{user.name}</h3>
                      <p className="text-sm font-medium text-school-blue dark:text-white">{user.position}</p>
                    </div>
                    <div>
                      {user.isApproved ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm border border-emerald-600">
                          <CheckCircle size={12} className="mr-1" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white shadow-sm border border-orange-600">
                          <Clock size={12} className="mr-1" /> Menunggu
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm flex flex-col gap-1.5 mt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Email</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{user.email || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">No Telp</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{user.phone || '-'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <button
                      onClick={() => openAssignModal(user)}
                      className={`p-2 transition-colors rounded-full ${!user.isApproved ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-school-blue dark:text-white'}`}
                      title={!user.isApproved ? 'Tugaskan' : 'Edit Profil'}
                    >
                      {!user.isApproved ? <Settings size={18}/> : <Edit size={18}/>}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 transition-colors rounded-full text-slate-400 hover:text-rose-500"
                      title="Hapus"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <div className="flex justify-center mb-2 text-slate-300">
                  <Users size={32} />
                </div>
                Tidak ada staf yang ditemukan berdasarkan pencarian Anda.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

















