const fs = require('fs');
const filePath = 'artifacts/study-tracker/vite.config.ts';
let content = fs.readFileSync(filePath, 'utf8');

const rollupConfig = `
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
    cssMinify: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'recharts': ['recharts'],
          'framer-motion': ['framer-motion'],
          'lucide': ['lucide-react'],
          'dexie': ['dexie', 'dexie-react-hooks'],
          'vendor': ['react', 'react-dom', 'wouter', '@tanstack/react-query'],
        }
      }
    }
  },`;

content = content.replace(/build:\s*\{[\s\S]+?target:\s*'es2020',\s*\},/, rollupConfig.trim());

fs.writeFileSync(filePath, content);
