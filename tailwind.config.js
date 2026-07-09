/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bsi: {
          50: '#EDF9F8',
          100: '#D3F0EE',
          200: '#A8E1DE',
          300: '#6FCCC7',
          400: '#35B3AC',
          500: '#00A39D',
          600: '#008B86',
          700: '#00706C',
          800: '#015754',
          900: '#013D3B',
          950: '#012A29',
        },
        gold: {
          300: '#FBD98A',
          400: '#F8C95C',
          500: '#F5B335',
          600: '#DD9A1B',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(1,42,41,0.05), 0 4px 16px rgba(1,42,41,0.06)',
        'card-hover': '0 4px 8px rgba(1,42,41,0.06), 0 12px 28px rgba(1,42,41,0.12)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'page-in': {
          '0%': { opacity: '0', transform: 'translateX(16px) scale(0.995)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'float-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'glow-soft': {
          '0%, 100%': { filter: 'drop-shadow(0 0 0 rgba(0,163,157,0))' },
          '50%': { filter: 'drop-shadow(0 4px 14px rgba(0,163,157,0.45))' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
        'gradient-move': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'flow-dash': {
          to: { strokeDashoffset: '-24' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.45s ease-out both',
        'scale-in': 'scale-in 0.45s cubic-bezier(0.22,1,0.36,1) both',
        'page-in': 'page-in 0.38s cubic-bezier(0.22,1,0.36,1) both',
        'float-soft': 'float-soft 5s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'glow-soft': 'glow-soft 4s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        'gradient-move': 'gradient-move 14s ease infinite',
        'flow-dash': 'flow-dash 1.2s linear infinite',
      },
    },
  },
  plugins: [],
}
