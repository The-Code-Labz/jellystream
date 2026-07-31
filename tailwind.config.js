/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#090B0C',
        surface: '#121518',
        surfaceHover: '#1A1E21',
        border: '#292E32',
        ink: '#F2F4F3',
        muted: '#9AA19F',
        accent: '#C7DC62',
        accentHover: '#D6E97B',
        danger: '#E0605F',
        success: '#75B798',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        shell: '1600px',
      },
      transitionDuration: {
        180: '180ms',
        220: '220ms',
        280: '280ms',
      },
      scale: {
        102: '1.025',
      },
      minHeight: {
        hero: '68dvh',
      },
    },
  },
  plugins: [],
};
