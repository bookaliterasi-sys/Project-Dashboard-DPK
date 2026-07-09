import { useEffect, useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoadingScreen from './components/LoadingScreen';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Events from './pages/Events';
import EventDatabase from './pages/EventDatabase';
import EventDetail from './pages/EventDetail';
import DataManagement from './pages/DataManagement';
import InputEvent from './pages/InputEvent';
import UploadExcel from './pages/UploadExcel';
import Report from './pages/Report';
import {
  restoreSession,
  startSession,
  clearSession,
  setActivePage,
  touchSession,
} from './utils/session';
import { authService } from './services/eventDataService';

const PAGES = {
  overview: Overview,
  events: Events,
  database: EventDatabase,
  detail: EventDetail,
  manage: DataManagement,
  input: InputEvent,
  upload: UploadExcel,
  report: Report,
};

export default function App() {
  const [session, setSession] = useState(() => restoreSession());
  const [page, setPage] = useState(() => session?.page || 'overview');
  const [booting, setBooting] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const handleLogin = (roleId) => {
    startSession(roleId, 'overview');
    const restored = restoreSession();
    setSession(restored);
    setPage(restored?.page || 'overview');
  };

  const handleLogout = useCallback(() => {
    authService.logout();
    clearSession();
    setSession(null);
    setPage('overview');
  }, []);

  const navigate = (id, eventId = null) => {
    if (!PAGES[id]) return;
    if (id === 'detail' && eventId) setSelectedEventId(eventId);
    setPage(id);
    setActivePage(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 850);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!session) return;
    const touch = () => touchSession();
    window.addEventListener('click', touch);
    window.addEventListener('keydown', touch);
    const interval = setInterval(() => {
      if (!restoreSession()) handleLogout();
    }, 30_000);
    return () => {
      window.removeEventListener('click', touch);
      window.removeEventListener('keydown', touch);
      clearInterval(interval);
    };
  }, [session, handleLogout]);

  // Tombol Export di header mengarahkan ke halaman Report & Export
  // (tempat seluruh unduhan Excel tersedia dan sudah berfungsi).
  const handleExport = () => {
    navigate('report');
    setToast('Membuka Report & Export — unduh laporan Excel di sini.');
    setTimeout(() => setToast(null), 2600);
  };

  if (booting) return <LoadingScreen label="Memuat ISE BSI Dashboard…" />;

  if (!session) return <Login onLogin={handleLogin} />;

  const Page = PAGES[page] || Overview;

  return (
    <div className="min-h-screen">
      <Sidebar
        activePage={page}
        onNavigate={navigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="lg:pl-60">
        <Header
          role={session.role}
          onOpenMobile={() => setMobileOpen(true)}
          onLogout={handleLogout}
          onExport={handleExport}
        />

        <main className="mx-auto w-full max-w-[1600px] overflow-x-clip px-4 py-5 sm:px-6 sm:py-6">
          <div key={`${page}-${dataVersion}`} className="animate-page-in">
            <Page onExport={handleExport} onNavigate={navigate} onSaved={() => setDataVersion((v) => v + 1)} eventId={selectedEventId} />
          </div>

          <footer className="mt-10 border-t border-slate-200/70 pb-4 pt-5 text-center text-[11px] text-slate-400">
            ISE BSI Event Monitoring Dashboard · Internal · © 2026 Bank Syariah Indonesia
          </footer>
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-bsi-950 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-fade-in-up">
          {toast}
        </div>
      )}
    </div>
  );
}
