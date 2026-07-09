import {
  LayoutDashboard,
  CalendarRange,
  Database,
  PlusCircle,
  Upload,
  FileText,
  Settings2,
  X,
} from 'lucide-react';
import { BrandLogo } from './ui';

// Navigasi baru — model per-event (institusi/CO-CI/follow-up/automation dibuang)
export const NAV_GROUPS = [
  {
    label: 'Monitoring',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'events', label: 'Event Monitoring', icon: CalendarRange },
      { id: 'database', label: 'Database Event', icon: Database },
    ],
  },
  {
    label: 'Manajemen Data',
    items: [
      { id: 'input', label: 'Input Event Baru', icon: PlusCircle },
      { id: 'upload', label: 'Upload Excel', icon: Upload },
      { id: 'report', label: 'Report & Export', icon: FileText },
      { id: 'manage', label: 'Manajemen Data', icon: Settings2 },
    ],
  },
];

export const ALL_PAGES = NAV_GROUPS.flatMap((g) => g.items);

function NavItem({ item, active, onNavigate }) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onNavigate(item.id)}
      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-semibold transition-all duration-300 ${
        active
          ? 'bg-gradient-to-r from-bsi-600 to-bsi-500 text-white shadow-md shadow-bsi-900/25'
          : 'text-bsi-100/70 hover:bg-white/[0.07] hover:text-white'
      }`}
    >
      <Icon
        size={17}
        strokeWidth={2.2}
        className={`shrink-0 transition-transform duration-300 ${active ? '' : 'group-hover:scale-110 group-hover:-rotate-3'}`}
      />
      <span className="truncate">{item.label}</span>
      {active && <span className="absolute right-2.5 h-1.5 w-1.5 rounded-full bg-gold-400" />}
    </button>
  );
}

function SidebarContent({ activePage, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-5 pt-6">
        <div className="rounded-2xl bg-white p-1.5 shadow-lg shadow-black/20 animate-glow-soft">
          <BrandLogo variant="ise" size={34} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-extrabold tracking-tight text-white">ISE BSI</p>
          <p className="truncate text-[10.5px] font-medium text-bsi-200/70">Event Monitoring Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-bsi-300/50">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavItem key={item.id} item={item} active={activePage === item.id} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.06] px-3 py-2.5">
          <BrandLogo variant="bsi-square" size={26} />
          <p className="text-[10px] leading-snug text-bsi-200/70">
            Internal ISE BSI
            <br />
            Bank Syariah Indonesia
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ activePage, onNavigate, mobileOpen, onCloseMobile }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-gradient-to-b from-bsi-950 via-bsi-900 to-bsi-950 lg:block">
        <SidebarContent activePage={activePage} onNavigate={onNavigate} />
      </aside>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={onCloseMobile}
          className={`absolute inset-0 bg-bsi-950/60 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-[270px] bg-gradient-to-b from-bsi-950 via-bsi-900 to-bsi-950 shadow-2xl transition-transform duration-300 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <button
            onClick={onCloseMobile}
            className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-bsi-200/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
          <SidebarContent
            activePage={activePage}
            onNavigate={(id) => {
              onNavigate(id);
              onCloseMobile();
            }}
          />
        </aside>
      </div>
    </>
  );
}
