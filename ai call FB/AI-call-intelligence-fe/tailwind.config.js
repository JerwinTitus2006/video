/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f5fa',
          100: '#e9eaf5',
          200: '#d9dbeb',
          300: '#bbbfdc',
          400: '#999ec9',
          500: '#7e83b9',
          600: '#6b70a8',
          700: '#5e6398',
          800: '#4f537d',
          900: '#424566',
          950: '#15173d', // Primary background
          DEFAULT: '#15173d',
        },
        accent: {
          50: '#fdf2fd',
          100: '#fce7fc',
          200: '#f8cff8',
          300: '#f2abf2',
          400: '#e779e7',
          500: '#d648d6',
          600: '#bb2abb',
          700: '#9e209e',
          800: '#982598', // Primary accent
          900: '#6d1d6d',
          DEFAULT: '#982598',
        },
        secondary: {
          50: '#fef7f7',
          100: '#fdefef',
          200: '#fce4e4',
          300: '#f9d1d1',
          400: '#f4b4b4',
          500: '#e491c9', // Secondary accent
          600: '#db7bb8',
          700: '#cf65a7',
          800: '#c34f96',
          900: '#b13985',
          DEFAULT: '#e491c9',
        },
        neutral: {
          50: '#f9f9f9',
          100: '#f1e9e9', // Light background / cards
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
          DEFAULT: '#f1e9e9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Poppins', 'ui-sans-serif', 'system-ui'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 20px rgba(152, 37, 152, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}