/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#FAFAF8',
        surface: '#FFFFFF',
        navy: {
          DEFAULT: '#1B2A4A',
          light:   '#2D4373',
          50:      '#E8EDF5',
          100:     '#C5D0E5',
        },
        accent:  '#4A6FA5',
        success: '#2D8B5F',
        error:   '#C4443C',
        warning: '#D4A030',
        muted:   '#6B7280',
        border:  '#E5E7EB',
      },
      fontFamily: {
        serif:  ['"Libre Baskerville"', 'Georgia', 'serif'],
        sans:   ['"Inter"', 'system-ui', 'sans-serif'],
        mono:   ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-lg': '0 4px 12px rgba(0,0,0,0.08)',
        'glow':    '0 0 20px rgba(74,111,165,0.15)',
      },
      animation: {
        'slide-in':  'slideIn 0.4s ease-out',
        'fade-in':   'fadeIn 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          '0%':   { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
