import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, ArrowLeft, Send } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const primaryDarker = 'hsl(217, 85%, 20%)';
  const primaryDark = 'hsl(217, 85%, 35%)';
  const primaryColor = 'hsl(217, 85%, 50%)';

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });

      if (error) throw error;

      setMessage('Link reset kata sandi telah dikirim ke email Anda. Silakan periksa kotak masuk atau folder spam Anda.');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal mengirim link reset kata sandi.');
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
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-white/0 rounded-[2rem] blur opacity-30 transition duration-1000"></div>

          <div className="relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-2xl rounded-[2rem] border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-8 sm:p-10 flex flex-col items-center">

            <div className="w-full mb-6">
              <h2 className="text-xl font-bold text-white mb-2">Lupa Kata Sandi?</h2>
              <p className="text-white/70 text-sm">Masukkan email yang terdaftar untuk menerima tautan.</p>
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

            <form onSubmit={handleResetPassword} className="space-y-6 w-full">
              <div className="space-y-2.5">
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

              <button
                type="submit"
                disabled={isSubmitting || !!message}
                className="w-full h-12 mt-6 rounded-xl border border-white/20 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all bg-[#1E3A8A] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? "Mengirim..." : "Kirim Link Reset"}
              </button>
            </form>

            <div className="mt-6 text-center w-full">
              <Link to="/login" className="inline-flex items-center text-white/70 hover:text-white text-sm font-semibold transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



















