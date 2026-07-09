import { Menu, Download, LogOut } from 'lucide-react';
import { BrandLogo } from './ui';
import { APP_NAME } from '../config';

export default function Header({ role, onOpenMobile, onLogout, onExport }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-lg">
      <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
        <button
          onClick={onOpenMobile}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:border-bsi-300 hover:bg-bsi-50 hover:text-bsi-700 lg:hidden"
          aria-label="Buka menu"
        >
          <Menu size={18} />
        </button>

        <div className="flex min-w-0 items-center gap-2.5">
          <span className="lg:hidden">
            <BrandLogo variant="ise" size={30} />
          </span>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-[14px] font-extrabold tracking-tight text-bsi-950">
              {APP_NAME}
            </p>
            <p className="truncate text-[11px] text-slate-400">
              Monitoring hasil event & efektivitas DPK — Bank Syariah Indonesia
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <span className="badge bg-gradient-to-r from-bsi-600 to-bsi-500 text-white shadow-sm">
            {role?.short || 'User'}
          </span>

          {onExport && (
            <button onClick={onExport} className="btn-secondary hidden !px-3 !py-2 text-xs sm:inline-flex">
              <Download size={14} />
              Export
            </button>
          )}
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-all duration-300 hover:bg-red-100 active:scale-[0.97]"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
