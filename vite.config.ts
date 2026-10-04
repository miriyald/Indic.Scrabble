import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base ('./') so the same build works on a GitHub Pages project
// site (miriyald.github.io/Indic.Scrabble/), a custom domain, and locally.
export default defineConfig({
  base: './',
  plugins: [react()],
});
