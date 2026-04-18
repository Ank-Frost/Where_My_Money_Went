/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0f0f0f',
          800: '#161616',
          700: '#1e1e1e',
          600: '#252525',
          500: '#2d2d2d',
          400: '#3a3a3a',
          300: '#4a4a4a',
        },
        brand: {
          red:   '#e05c5c',
          blue:  '#4a9eff',
          green: '#4caf82',
          yellow:'#f0a500',
          purple:'#9b6dff',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in':  'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to:   { transform: 'translateY(0)',     opacity: '1' }
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' }
        }
      }
    }
  },
  plugins: []
}
