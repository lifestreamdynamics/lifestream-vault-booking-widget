import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'LsvBooking',
      fileName: 'lsv-booking',
      formats: ['es', 'umd'],
    },
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // No external deps — everything bundled
      },
    },
  },
});
