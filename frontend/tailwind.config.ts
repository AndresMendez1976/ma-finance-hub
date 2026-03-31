import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm palette — MA Finance Hub identity
        border: '#D4C4A8',
        background: '#F5F0E8',
        foreground: '#5C4033',
        primary: { DEFAULT: '#2D6A4F', foreground: '#FFFFFF' },
        secondary: { DEFAULT: '#8B7355', foreground: '#FFFFFF' },
        muted: { DEFAULT: '#E8DCC8', foreground: '#8B7355' },
        destructive: { DEFAULT: '#E07A5F', foreground: '#FFFFFF' },
        accent: { DEFAULT: '#E8DCC8', foreground: '#5C4033' },
        card: { DEFAULT: '#FFFFFF', foreground: '#5C4033' },
        success: { DEFAULT: '#2D6A4F', foreground: '#FFFFFF' },
        warning: { DEFAULT: '#D4A854', foreground: '#5C4033' },
        info: { DEFAULT: '#B4D4E7', foreground: '#5C4033' },
        // Sidebar-specific
        sidebar: {
          DEFAULT: '#1B4332',
          foreground: '#FFFFFF',
          muted: '#95D5B2',
          hover: '#2D6A4F',
          active: '#FFFFFF',
        },
        // Input styling
        input: '#D4C4A8',
        ring: '#2D6A4F',
      },
      borderRadius: { lg: '0.5rem', md: '0.375rem', sm: '0.25rem' },
    },
  },
  plugins: [],
};
export default config;
