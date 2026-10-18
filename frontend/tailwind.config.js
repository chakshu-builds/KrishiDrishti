/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        agri: {
          bg: '#F9FAF6',
          surface: '#FFFFFF',
          border: '#E2E8DC',
          darkBorder: '#CBD5C0',
          green: {
            DEFAULT: '#1B4D3E',
            hover: '#246552',
            light: '#EAF3ED',
            dark: '#113329',
          },
          harvest: {
            DEFAULT: '#D9822B',
            light: '#FDF4EB',
            dark: '#B06114',
          },
          cyan: {
            DEFAULT: '#1C7C82',
            light: '#EBF6F6',
          },
          alert: {
            red: '#C62828',
            redLight: '#FFEBEE',
            orange: '#ED6C02',
            orangeLight: '#FFF4E5',
            blue: '#0288D1',
            blueLight: '#E1F5FE',
          },
          text: {
            primary: '#1A231E',
            secondary: '#55655E',
            muted: '#8A9992',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
