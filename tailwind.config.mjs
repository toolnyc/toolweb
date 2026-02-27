/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        cyan: '#00FFFF',
        magenta: '#FF00FF',
        yellow: '#FFEB00',
        'lite-gray': '#f4f4f4',
        'caption-gray': '#737373',
        'dark-gray': '#414141',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'body': ['13px', { lineHeight: '18px' }],
        'hero': ['clamp(3rem, 8vw, 7rem)', { lineHeight: '0.95', letterSpacing: '-0.02em' }],
        'snippet': ['clamp(1.5rem, 3vw, 2.5rem)', { lineHeight: '1.3' }],
      },
      screens: {
        'sm': '480px',
        'md': '800px',
        'lg': '1000px',
        'xl': '1400px',
      },
    },
  },
  plugins: [],
};
