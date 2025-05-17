/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3fa',
          100: '#ebe6f5',
          200: '#d7cdea',
          300: '#b8a7da',
          400: '#9a80c7',
          500: '#7e57c2', // Primary
          600: '#6d43b2',
          700: '#5d3798',
          800: '#4f307e',
          900: '#432c67',
        },
        secondary: {
          50: '#e9fcfd',
          100: '#d0f7fa',
          200: '#aaeff5',
          300: '#76e2ee',
          400: '#4dd0e1', // Secondary
          500: '#25aec0',
          600: '#1e8b9b',
          700: '#1e6d7a',
          800: '#1f5763',
          900: '#1d4852',
        },
        accent: {
          50: '#fef6ee',
          100: '#fdead8',
          200: '#f9d1b0',
          300: '#f5b077',
          400: '#f08a47', // Accent
          500: '#eb6a22',
          600: '#db4f17',
          700: '#b53913',
          800: '#912e16',
          900: '#762715',
        },
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '72': '18rem',
        '80': '20rem',
        '96': '24rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};