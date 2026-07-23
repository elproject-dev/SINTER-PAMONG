import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, UserPlus, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const primaryDarker = 'hsl(217, 85%, 20%)';
  const primaryDark = 'hsl(217, 85%, 35%)';
  const primaryColor = 'hsl(217, 85%, 50%)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // 1. Sign up user via Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            position: 'Belum Ditugaskan',
            role: 'staff' // Default role
          }
        }
      });

      if (authError) throw authError;

      if (data.user) {
        // 2. Insert into profil_pengguna table
        const { error: profileError } = await supabase.from('profil_pengguna').insert([
          {
            id: data.user.id,
            name,
            role: 'staff',
            position: 'Belum Ditugaskan',
            job_roles: [],
            no_telp: phone,
            email
          }
        ]);
        
        if (profileError) throw profileError;
      }

      alert('Pendaftaran berhasil! Silakan login dengan akun baru Anda.');
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat mendaftar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${primaryDarker} 0%, ${primaryDark} 50%, ${primaryColor} 100%)`
      }}
    >
      
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-black/20 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-widest drop-shadow-lg mt-6">SINTER PAMONG</h1>
          <p className="text-white/70 mt-3 text-sm sm:text-base font-medium tracking-wide">DAFTAR AKUN BARU</p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-white/0 rounded-[2rem] blur opacity-30 transition duration-1000"></div>

          <div className="relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-2xl rounded-[2rem] border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-8 sm:p-10 flex flex-col items-center">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-white p-3 rounded-lg w-full text-center text-sm mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5 w-full">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/90 ml-1">Nama Lengkap</label>
                <div className="relative group/input">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-school-blue dark:text-white transition-colors" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masukkan nama"
                    className="w-full h-12 pl-11 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-50 placeholder:text-slate-400 rounded-xl focus:bg-white dark:bg-slate-800 focus:border-school-blue outline-none focus:ring-4 focus:ring-school-blue/20 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/90 ml-1">Email</label>
                <div className="relative group/input">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-school-blue dark:text-white transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan email"
                    className="w-full h-12 pl-11 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-50 placeholder:text-slate-400 rounded-xl focus:bg-white dark:bg-slate-800 focus:border-school-blue outline-none focus:ring-4 focus:ring-school-blue/20 transition-all text-sm"
                    required
                  />
                </div>
              </div>


              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/90 ml-1">Nomor Telepon</label>
                <div className="relative group/input">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-school-blue dark:text-white transition-colors" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full h-12 pl-11 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-50 placeholder:text-slate-400 rounded-xl focus:bg-white dark:bg-slate-800 focus:border-school-blue outline-none focus:ring-4 focus:ring-school-blue/20 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/90 ml-1">Password</label>
                <div className="relative group/input">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-school-blue dark:text-white transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Buat password"
                    className="w-full h-12 pl-11 pr-12 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-50 placeholder:text-slate-400 rounded-xl focus:bg-white dark:bg-slate-800 focus:border-school-blue outline-none focus:ring-4 focus:ring-school-blue/20 transition-all text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 mt-6 rounded-xl border border-white/20 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all bg-[#1E3A8A] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {isSubmitting ? "Memproses..." : "Daftar Akun"}
              </button>
            </form>

            <div className="mt-6 text-center w-full">
              <p className="text-white/70 text-sm">
                Sudah punya akun?{" "}
                <Link to="/login" className="text-white font-semibold hover:underline hover:text-white/90 transition-colors">
                  Masuk di sini
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


















