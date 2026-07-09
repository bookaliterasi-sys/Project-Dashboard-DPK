import { BrandLogo } from './ui';

/**
 * Loading screen berlogo — dipakai saat boot aplikasi & transisi masuk dashboard.
 * Ringan: hanya CSS (conic ring + pulse), tidak ada library animasi.
 */
export default function LoadingScreen({ label = 'Menyiapkan dashboard…', fullscreen = true }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${fullscreen ? 'fixed inset-0 z-[100]' : 'absolute inset-0'} login-gradient flex flex-col items-center justify-center gap-6`}
    >
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-bsi-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-gold-500/10 blur-3xl" />

      <div className="ring-loader">
        <div className="rounded-2xl bg-white/95 p-3 shadow-2xl shadow-black/30">
          <BrandLogo variant="ise" size={46} />
        </div>
      </div>

      <BrandLogo variant="bsi" size={22} light />

      <div className="flex items-center gap-2 text-[12px] font-medium text-white/75">
        <span className="dot-pulse" />
        {label}
      </div>
    </div>
  );
}
