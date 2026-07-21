import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Layout } from './components/Layout';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AttendanceList } from './pages/admin/AttendanceList';
import { AdminStaffList } from './pages/admin/StaffList';
import { AdminKPIEvaluation } from './pages/admin/KPIEvaluation';
import { AdminReviewLaporanTugas } from './pages/admin/PenilaianTugas';
import { AdminTugasStaff } from './pages/admin/TugasStaff';
import { AdminSettings } from './pages/admin/Settings';
import { StaffDashboard } from './pages/staff/Dashboard';
import { BukuSaku } from './pages/staff/Laporan-Kpi';
import { KPI } from './pages/staff/Nilai-Kpi';
import { Settings } from './pages/staff/Settings';
import { Absensi } from './pages/staff/Absensi';
import { initializeDB } from './lib/db';
import { supabase } from './lib/supabase';
import { User } from './lib/types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize mock data in local storage
    initializeDB();

    // Check if user is logged in
    const storedUser = localStorage.getItem('hr_current_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('hr_current_user', JSON.stringify(loggedInUser));
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('hr_current_user', JSON.stringify(updatedUser));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('hr_current_user');
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-school-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/staff'} replace /> : <Login onLogin={handleLogin} />}
        />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<Layout user={user} onLogout={handleLogout} allowedRole="admin" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="absensi" element={<AttendanceList />} />
          <Route path="staff" element={<AdminStaffList />} />
          <Route path="kpi" element={<AdminKPIEvaluation currentUser={user!} />} />
          <Route path="penilaian-tugas" element={<AdminReviewLaporanTugas />} />
          <Route path="tugas-staff" element={<AdminTugasStaff />} />
          <Route path="settings" element={<AdminSettings user={user!} onUserUpdate={handleUpdateUser} />} />
        </Route>

        {/* Staff Routes */}
        <Route path="/staff" element={<Layout user={user} onLogout={handleLogout} allowedRole="staff" />}>
          <Route index element={<StaffDashboard user={user!} />} />
          <Route path="absensi" element={<Absensi user={user!} />} />
          <Route path="kpi" element={<BukuSaku user={user!} />} />
          <Route path="nilai-kpi" element={<KPI user={user!} />} />
          <Route path="settings" element={<Settings user={user!} onUserUpdate={handleUpdateUser} />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
