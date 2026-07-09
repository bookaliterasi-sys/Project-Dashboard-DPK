import { useEffect, useRef, useState } from 'react';

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Animasi angka 0 -> target memakai requestAnimationFrame.
 * Ringan (tanpa library), menghormati prefers-reduced-motion,
 * dan otomatis melanjutkan dari nilai sebelumnya jika target berubah.
 */
export function useCountUp(target, { duration = 900 } = {}) {
  const numeric = typeof target === 'number' && isFinite(target);
  const [value, setValue] = useState(numeric && !prefersReduced() ? 0 : target);
  const raf = useRef();
  const fromRef = useRef(0);

  useEffect(() => {
    if (!numeric || prefersReduced()) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const startVal = fromRef.current;
    const delta = target - startVal;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(startVal + delta * easeOutCubic(p));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration, numeric]);

  return numeric ? value : target;
}
