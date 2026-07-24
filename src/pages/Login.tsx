import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User } from '../lib/types';
import { LogIn, Mail, Lock, Eye, EyeOff, GraduationCap } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const primaryDarker = 'hsl(217, 85%, 20%)';
  const primaryDark = 'hsl(217, 85%, 35%)';
  const primaryColor = 'hsl(217, 85%, 50%)';

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // Fetch the user's profile from the public.profil_pengguna table
        const { data: profile, error: profileError } = await supabase
          .from('profil_pengguna')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          throw new Error('Profil pengguna tidak ditemukan.');
        }

        if (profile.role !== 'admin' && profile.is_approved === false) {
          await supabase.auth.signOut();
          throw new Error('Akun Anda sedang menunggu persetujuan dan penugasan dari Admin.');
        }

        const appUser: User = {
          id: profile.id,
          name: profile.name,
          email: data.user.email || email,
          password: password, // For simplicity in keeping App state happy
          position: profile.position,
          role: profile.role,
          jobRoles: profile.job_roles
        };
        
        onLogin(appUser);
        if (appUser.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/staff');
        }
      }
    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message || 'Email atau kata sandi salah.';
      if (errorMessage === 'Invalid login credentials') {
        errorMessage = 'Email atau kata sandi yang Anda masukkan salah.';
      }
      setError(errorMessage);
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
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <GraduationCap className="w-28 h-28 text-white drop-shadow-md" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-widest drop-shadow-lg">SINTER PAMONG</h1>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-white/0 rounded-[2rem] blur opacity-30 transition duration-1000"></div>

          <div className="relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-2xl rounded-[2rem] border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-8 sm:p-10 flex flex-col items-center">
            {error && (
              <div className="bg-red-600 border border-red-700 text-white p-3 rounded-lg w-full text-center text-sm mb-4 font-bold shadow-md">
                {error}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-6 w-full">
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-white/90 ml-1">Email</label>
                <div className="relative group/input">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-school-blue transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan email"
                    className="w-full h-12 pl-11 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-school-blue outline-none focus:ring-4 focus:ring-school-blue/20 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-white/90 ml-1">Password</label>
                <div className="relative group/input">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-school-blue transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full h-12 pl-11 pr-12 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-school-blue outline-none focus:ring-4 focus:ring-school-blue/20 transition-all text-sm"
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
                <div className="flex justify-end mt-1">
                  <Link to="/forgot-password" className="text-xs font-semibold text-white/70 hover:text-white transition-colors">
                    Lupa kata sandi?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 mt-6 rounded-xl border border-white/20 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all bg-[#1E3A8A] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {isSubmitting ? "Memproses..." : "Masuk"}
              </button>
            </form>

            <div className="mt-6 text-center w-full">
              <p className="text-white/70 text-sm">
                Belum punya akun?{" "}
                <Link to="/register" className="text-white font-semibold hover:underline hover:text-white/90 transition-colors">
                  Daftar sekarang
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



















