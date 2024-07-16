import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'typai',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format}.js`
    },
    rollupOptions: {
      external: [], // 依存関係をここに追加
      output: {
        globals: {} // グローバル変数をここに追加
      }
    }
  },
  plugins: [dts()]  
});
