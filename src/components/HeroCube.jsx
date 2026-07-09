import { Landmark } from 'lucide-react';

/**
 * "Corporate banking cube" 3D — murni CSS (transform-style: preserve-3d).
 * Tanpa Three.js/WebGL agar bundle tetap ringan. Dekoratif, hidden di layar kecil.
 */
export default function HeroCube({ size = 92 }) {
  const half = size / 2;
  const faces = [
    { t: `rotateY(0deg) translateZ(${half}px)`, label: 'ISE' },
    { t: `rotateY(90deg) translateZ(${half}px)`, icon: true },
    { t: `rotateY(180deg) translateZ(${half}px)`, label: 'BSI' },
    { t: `rotateY(270deg) translateZ(${half}px)`, icon: true },
    { t: `rotateX(90deg) translateZ(${half}px)` },
    { t: `rotateX(-90deg) translateZ(${half}px)` },
  ];
  return (
    <div className="scene-3d pointer-events-none select-none" aria-hidden="true">
      <div className="cube-float" style={{ width: size, height: size }}>
        <div className="cube-3d" style={{ width: size, height: size }}>
          {faces.map((f, i) => (
            <div key={i} className="face" style={{ width: size, height: size, transform: f.t }}>
              {f.label && (
                <span className="text-sm font-extrabold tracking-widest text-white/90">{f.label}</span>
              )}
              {f.icon && <Landmark size={22} className="text-gold-300/90" strokeWidth={2.2} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
