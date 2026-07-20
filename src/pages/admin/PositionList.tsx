import React, { useState, useEffect } from 'react';
import { MasterJabatan } from '../../lib/types';
import { getPositions, addPosition, deletePosition, updatePosition } from '../../lib/db';
import { Briefcase, Plus, Trash2, ShieldAlert, Search, Edit } from 'lucide-react';
import { useRealtimeSubscription } from '../../lib/useRealtime';

export const PositionList: React.FC = () => {
  const [positions, setPositions] = useState<MasterJabatan[]>([]);
  const [newPosition, setNewPosition] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<MasterJabatan | null>(null);

  const closeModal = () => {
    setEditingPosition(null);
    setNewPosition('');
    setError('');
    setIsModalOpen(false);
  };

  const fetchPositions = async () => {
    const data = await getPositions();
    setPositions(data);
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  useRealtimeSubscription(['master_jabatan'], fetchPositions);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosition.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      if (editingPosition) {
        await updatePosition(editingPosition.id, newPosition.trim());
        setEditingPosition(null);
      } else {
        await addPosition(newPosition.trim());
      }
      setNewPosition('');
      setIsModalOpen(false);
      await fetchPositions();
    } catch (err: any) {
      setError(editingPosition ? 'Gagal mengubah jabatan.' : 'Gagal menambahkan jabatan. Pastikan koneksi stabil.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Hapus jabatan "${name}" dari daftar?`)) {
      try {
        await deletePosition(id);
        await fetchPositions();
      } catch (err: any) {
        alert('Gagal menghapus jabatan.');
      }
    }
  };

  const filteredPositions = positions.filter(pos =>
    pos.nama_jabatan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 mb-1 sm:mb-2 tracking-tight">Data Jabatan</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg">Kelola daftar penugasan dan jabatan utama staf</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Cari jabatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 pr-4 pl-10 text-slate-700 focus:ring-4 focus:ring-school-blue/10 focus:border-school-blue outline-none transition-all shadow-sm font-medium"
            />
          </div>

          <button
            onClick={() => {
              setError('');
              setNewPosition('');
              setEditingPosition(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-school-blue text-white rounded-xl font-bold hover:bg-blue-700 hover:shadow-lg transition-all"
          >
            <Plus size={18} />
            Tambah Jabatan
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center space-x-2 bg-white">
          <Briefcase size={20} className="text-slate-600" />
          <h2 className="font-bold text-slate-800 text-lg">Daftar Jabatan</h2>
        </div>
        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="w-full text-left border-collapse min-w-[600px] hidden md:table">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold border border-slate-200 w-12 text-center">NO</th>
                <th className="px-4 py-3 font-bold border border-slate-200">NAMA JABATAN</th>
                <th className="px-4 py-3 font-bold border border-slate-200 text-center w-28">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredPositions.length > 0 ? (
                filteredPositions.map((pos, index) => (
                  <tr key={pos.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 border border-slate-200 text-center text-sm font-medium text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-sm font-bold text-slate-800">
                      {pos.nama_jabatan}
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingPosition(pos);
                            setNewPosition(pos.nama_jabatan);
                            setError('');
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-school-blue hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(pos.id, pos.nama_jabatan)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500 border border-slate-200">
                    <div className="flex justify-center mb-2 text-slate-300">
                      <Briefcase size={32} />
                    </div>
                    Tidak ada jabatan yang ditemukan berdasarkan pencarian Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y divide-slate-100">
            {filteredPositions.length > 0 ? (
              filteredPositions.map(pos => (
                <div key={pos.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div className="flex flex-col">
                    <h3 className="font-extrabold text-slate-800 text-base">{pos.nama_jabatan}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingPosition(pos);
                        setNewPosition(pos.nama_jabatan);
                        setError('');
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-school-blue hover:bg-blue-50 rounded-xl transition-all"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(pos.id, pos.nama_jabatan)}
                      className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Hapus"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                <div className="flex justify-center mb-2 text-slate-300">
                  <Briefcase size={32} />
                </div>
                Tidak ada jabatan yang ditemukan berdasarkan pencarian Anda.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Tambah Jabatan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-md flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl shrink-0">
              <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">
                {editingPosition ? 'Edit Jabatan' : 'Tambah Jabatan Baru'}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center">
                  <ShieldAlert size={16} className="mr-2 shrink-0" /> {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nama Jabatan</label>
                <input
                  type="text"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  placeholder="Contoh: Guru Olahraga"
                  className="w-full bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl px-4 py-3 focus:border-school-blue outline-none focus:ring-4 focus:ring-school-blue/10 transition-all"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !newPosition.trim()}
                  className="flex-1 px-4 py-3 rounded-xl bg-school-blue text-white font-bold hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 flex justify-center items-center"
                >
                  {isLoading ? 'Menyimpan...' : (editingPosition ? 'Simpan' : 'Tambahkan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
