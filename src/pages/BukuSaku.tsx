import React from 'react';
import { BookOpen } from 'lucide-react';

export const BukuSaku: React.FC = () => {
  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 mb-1 sm:mb-2 tracking-tight">Buku Saku</h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg">Panduan dan tata tertib Sinter Pamong</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="flex justify-center mb-4 text-slate-300">
          <BookOpen size={48} />
        </div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">Halaman Buku Saku</h2>
        <p className="text-slate-500">Konten buku saku akan ditambahkan di sini.</p>
      </div>
    </div>
  );
};
