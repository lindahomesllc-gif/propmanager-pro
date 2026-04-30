import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        bg: {
          DEFAULT: '#0E0E0C',
          2: '#161614',
          3: '#1E1E1B',
          4: '#262623',
        },
        green: {
          DEFAULT: '#4ADE9A',
          dk: '#22C574',
          lt: 'rgba(74,222,154,0.1)',
        },
        amber: {
          DEFAULT: '#FBB040',
          lt: 'rgba(251,176,64,0.1)',
        },
      },
    },
  },
  plugins: [],
}
export default config
