import { useState } from 'react';
import { ShieldCheck, ChevronRight, User, Lock, AlertCircle } from 'lucide-react';
import { BrandLogo } from '../components/ui';
import HeroCube from '../components/HeroCube';
import LoadingScreen from '../components/LoadingScreen';
import { authService } from '../services/eventDataService';
import { APP_NAME } from '../config';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!username || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }
    setEntering(true);
    try {
      const data = await authService.login(username, password);
      // beri jeda animasi lalu masuk dengan role dari server
      setTimeout(() => onLogin(data.user?.role || 'admin'), 400);
    } catch (e) {
      setEntering(false);
      setError(e.message || 'Login gagal. Periksa kembali kredensial Anda.');
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="login-gradient relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {entering && <LoadingScreen label="Masuk ke dashboard…" />}

      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-bsi-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-gold-500/10 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-bsi-400/10 blur-3xl animate-pulse-soft" />

      {/* 3D financial object melayang pelan (CSS-3D, ringan) */}
      <div className="pointer-events-none absolute right-[8%] top-[16%] hidden opacity-70 lg:block">
        <HeroCube size={110} />
      </div>
      <div className="pointer-events-none absolute left-[9%] bottom-[14%] hidden opacity-40 lg:block">
        <HeroCube size={64} />
      </div>

      <div className={`w-full max-w-md transition-all duration-500 ${entering ? 'scale-[0.97] opacity-0' : 'scale-100 opacity-100'}`}>
        <div className="mb-7 flex flex-col items-center gap-4 animate-scale-in">
          <div className="rounded-3xl bg-white/95 p-3.5 shadow-2xl shadow-black/30 animate-float-soft">
            <BrandLogo variant="ise" size={62} />
          </div>
          <BrandLogo variant="bsi" size={30} light />
        </div>

        <div className="card animate-fade-in-up border-white/40 bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-7" style={{ animationDelay: '120ms' }}>
          <div className="mb-5 text-center">
            <h1 className="text-lg font-extrabold tracking-tight text-bsi-950 sm:text-xl">
              {APP_NAME}
            </h1>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">
              Monitoring hasil event & efektivitas DPK — internal ISE BSI.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Username</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={onKeyDown}
                  autoComplete="username"
                  placeholder="admin"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-bsi-400 focus:ring-4 focus:ring-bsi-100"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={onKeyDown}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-bsi-400 focus:ring-4 focus:ring-bsi-100"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-[12.5px] font-medium text-red-600 ring-1 ring-red-100 animate-fade-in">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={entering}
            className="btn-primary mt-5 w-full !py-3 text-[14px] animate-fade-in-up disabled:opacity-70"
            style={{ animationDelay: '220ms' }}
          >
            {entering ? 'Memverifikasi…' : 'Masuk ke Dashboard'}
            {!entering && <ChevronRight size={16} />}
          </button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <ShieldCheck size={12} className="text-bsi-500" />
            Akses internal ISE BSI · Session 5 menit
          </p>
        </div>

        <p className="mt-5 text-center text-[11px] text-white/40 animate-fade-in" style={{ animationDelay: '380ms' }}>
          © 2026 ISE — Bank Syariah Indonesia
        </p>
      </div>
    </div>
  );
}
