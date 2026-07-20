import React, { useState, useEffect } from 'react';
import { User, StaffTask } from '../../lib/types';
import { getStaff, getStaffTasks, addStaffTask, deleteStaffTask, updateStaffTask } from '../../lib/db';
import { Plus, Trash2, Search, ListChecks, User as UserIcon, Edit, Check } from 'lucide-react';
import { useRealtimeSubscription } from '../../lib/useRealtime';

export const AdminTugasStaff: React.FC = () => {
  const [staff, setStaff] = useState<User[]>([]);
  const [allTasks, setAllTasks] = useState<StaffTask[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccess, setShowSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const closeModal = () => {
    setEditingTaskId(null);
    setNewTaskName('');
    setNewTaskDesc('');
    setIsModalOpen(false);
  };

  const fetchData = async () => {
    const staffData = await getStaff();
    setStaff(staffData);
    const tasks = await getStaffTasks();
    setAllTasks(tasks);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useRealtimeSubscription(['tugas_staff', 'profil_pengguna'], fetchData);

  const selectedUser = staff.find(s => s.id === selectedStaff);
  const staffTasks = allTasks.filter(t => t.userId === selectedStaff);

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.position || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !newTaskName.trim()) return;

    try {
      if (editingTaskId) {
        await updateStaffTask(editingTaskId, {
          namaTugas: newTaskName.trim(),
          deskripsi: newTaskDesc.trim() || undefined
        });
        setEditingTaskId(null);
        setShowSuccess('Tugas berhasil diubah!');
      } else {
        await addStaffTask({
          userId: selectedStaff,
          namaTugas: newTaskName.trim(),
          deskripsi: newTaskDesc.trim() || undefined
        });
        setShowSuccess('Tugas berhasil ditambahkan!');
      }
      setNewTaskName('');
      setNewTaskDesc('');
      await fetchData();
      setTimeout(() => setShowSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan tugas.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Yakin ingin menghapus tugas ini?')) return;
    try {
      await deleteStaffTask(taskId);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus tugas.');
    }
  };

  // Group tasks count per staff
  const taskCountMap: Record<string, number> = {};
  allTasks.forEach(t => {
    taskCountMap[t.userId] = (taskCountMap[t.userId] || 0) + 1;
  });

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 mb-1 sm:mb-2 tracking-tight">Tugas Staf</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg">Atur dan kelola daftar tugas laporan yang wajib dikerjakan setiap staf/guru</p>
        </div>

        <div className="relative w-full md:w-72 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Cari nama staf..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 pr-4 pl-10 text-slate-700 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium"
          />
        </div>
      </div>

      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl flex items-center shadow-sm font-medium animate-in fade-in slide-in-from-top-4">
          <div className="mr-3 bg-emerald-100 p-1.5 rounded-full">✅</div>
          {showSuccess}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center space-x-2 bg-white">
          <ListChecks size={20} className="text-slate-600" />
          <h2 className="font-bold text-slate-800 text-lg">Data Tugas Staf & Guru</h2>
        </div>
        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="w-full text-left border-collapse min-w-[800px] hidden md:table">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold border border-slate-200 w-12 text-center">NO</th>
                <th className="px-4 py-3 font-bold border border-slate-200">NAMA LENGKAP</th>
                <th className="px-4 py-3 font-bold border border-slate-200">PROFESI / JABATAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center">JUMLAH TUGAS</th>
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
                      {user.position || 'Belum ada jabatan'}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm text-slate-700">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                        {taskCountMap[user.id] || 0} Tugas
                      </span>
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedStaff(user.id);
                            setIsModalOpen(true);
                          }}
                          title="Kelola Tugas"
                          className="p-2 rounded-full text-school-blue hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <ListChecks size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-2 text-slate-300">
                      <UserIcon size={32} />
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
                      <p className="text-sm font-medium text-school-blue">{user.position || 'Belum ada jabatan'}</p>
                    </div>
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                        {taskCountMap[user.id] || 0} Tugas
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-2 flex justify-end gap-2 mt-1">
                    <button
                      onClick={() => {
                        setSelectedStaff(user.id);
                        setIsModalOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold bg-blue-50 text-school-blue hover:bg-blue-100 transition-all"
                    >
                      <ListChecks size={16}/> Kelola Tugas
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                <div className="flex justify-center mb-2 text-slate-300">
                  <UserIcon size={32} />
                </div>
                Tidak ada staf yang ditemukan berdasarkan pencarian Anda.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Kelola Tugas */}
      {isModalOpen && selectedStaff && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">Kelola Tugas Staf</h3>
                <p className="text-sm text-slate-500 mt-1 font-semibold">{selectedUser.name} • {selectedUser.position || 'Belum ada jabatan'}</p>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 scrollbar-none">
              {/* Form Tambah Tugas */}
              <form onSubmit={handleAddTask} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                  {editingTaskId ? <Edit size={18} className="text-emerald-500" /> : <Plus size={18} className="text-school-blue" />}
                  {editingTaskId ? 'Edit Tugas' : 'Tambah Tugas Baru'}
                </h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="Nama tugas (misal: Membuat RPP, Piket Harian, dll)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all"
                    required
                  />
                  <input
                    type="text"
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="Deskripsi singkat (opsional)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all"
                  />
                  {editingTaskId ? (
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg text-sm flex items-center justify-center gap-2"
                      >
                        <Check size={18} /> Simpan Perubahan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTaskId(null);
                          setNewTaskName('');
                          setNewTaskDesc('');
                        }}
                        className="px-5 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all text-sm"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-school-blue to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 hover:shadow-blue-500/30 text-sm flex items-center justify-center gap-2"
                    >
                      <Plus size={18} /> Tambahkan Tugas
                    </button>
                  )}
                </div>
              </form>

              {/* Daftar Tugas Staf */}
              <div>
                <h4 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                  <ListChecks size={20} className="text-school-blue" />
                  Daftar Tugas ({staffTasks.length})
                </h4>
                {staffTasks.length > 0 ? (
                  <div className="space-y-3">
                    {staffTasks.map((task, idx) => (
                      <div key={task.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-slate-200 hover:shadow-sm transition-all">
                        <div className="w-8 h-8 bg-school-blue/10 text-school-blue rounded-lg flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800">{task.namaTugas}</p>
                          {task.deskripsi && (
                            <p className="text-sm text-slate-500 mt-1">{task.deskripsi}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTaskId(task.id);
                              setNewTaskName(task.namaTugas);
                              setNewTaskDesc(task.deskripsi || '');
                            }}
                            className="p-2 text-slate-400 hover:text-school-blue hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit tugas"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all animate-out fade-out-50"
                            title="Hapus tugas"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    <ListChecks size={32} className="mb-2 text-slate-300" />
                    <p className="font-medium text-slate-500">Belum ada tugas untuk staf ini.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-3xl">
              <button
                type="button"
                onClick={closeModal}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
