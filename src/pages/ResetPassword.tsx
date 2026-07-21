import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Eye, EyeOff, Save } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const primaryDarker = 'hsl(217, 85%, 20%)';
  const primaryDark = 'hsl(217, 85%, 35%)';
  const primaryColor = 'hsl(217, 85%, 50%)';

  useEffect(() => {
    // Check if the user is actually in a recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Sesi tidak valid atau telah kedaluwarsa. Silakan minta link reset kata sandi baru.');
      }
    };
    checkSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Kata sandi tidak cocok.');
      return;
    }

    if (password.length < 6) {
      setError('Kata sandi harus minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setMessage('Kata sandi berhasil diperbarui! Anda akan dialihkan ke halaman login...');
      
      // Update local storage if they happen to be 'logged in' or just clear it
      localStorage.removeItem('hr_current_user');
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memperbarui kata sandi.');
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
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-black/20 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-widest drop-shadow-lg mt-6">SINTER PAMONG</h1>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-white/0 rounded-[2rem] blur opacity-30 transition duration-1000"></div>

          <div className="relative bg-white/10 backdrop-blur-2xl rounded-[2rem] border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-8 sm:p-10 flex flex-col items-center">
            
            <div className="w-full mb-6">
              <h2 className="text-xl font-bold text-white mb-2">Buat Kata Sandi Baru</h2>
              <p className="text-white/70 text-sm">Silakan masukkan kata sandi baru untuk akun Anda.</p>
            </div>

            {error && (
              <div className="bg-red-600 border border-red-700 text-white p-3 rounded-lg w-full text-center text-sm mb-4 font-bold shadow-md">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-emerald-500 border border-emerald-600 text-white p-3 rounded-lg w-full text-center text-sm mb-4 font-bold shadow-md">
                {message}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-6 w-full">
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-white/90 ml-1">Kata Sandi Baru</label>
                <div className="relative group/input">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-school-blue transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full h-12 pl-11 pr-12 bg-white/90 border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-school-blue outline-none focus:ring-4 focus:ring-school-blue/20 transition-all text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-white/90 ml-1">Konfirmasi Kata Sandi Baru</label>
                <div className="relative group/input">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-school-blue transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi"
                    className="w-full h-12 pl-11 pr-12 bg-white/90 border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-school-blue outline-none focus:ring-4 focus:ring-school-blue/20 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !!message}
                className="w-full h-12 mt-6 rounded-xl border border-white/20 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all bg-[#1E3A8A] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? "Menyimpan..." : "Simpan Kata Sandi"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
