import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // El puerto sale de la variable PORT si esta definida (util cuando 5173 ya
  // esta ocupado por otro proyecto); si no, 5173.
  server: { port: Number(process.env.PORT) || 5173, strictPort: false },
  build: {
    target: 'es2022',
    // Los assets del juego viven en public/assets/ y Vite los copia tal cual a
    // dist/assets/. Si el bundle tambien fuera a dist/assets/, los dos arboles
    // se mezclarian: mandamos JS/CSS a dist/bundle/ y queda todo separado.
    assetsDir: 'bundle',
    // Phaser es grande; evitamos el warning de chunk size y lo separamos del codigo del juego.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
});
