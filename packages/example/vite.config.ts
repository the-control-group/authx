import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import $monacoEditorPlugin from 'vite-plugin-monaco-editor';

const monacoEditorPlugin: typeof $monacoEditorPlugin = ($monacoEditorPlugin as any).default;

export default defineConfig({
  root: 'src/client',
  build: {
    outDir: '../../static'
  },
  plugins: [
    react(),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'json'],
      customWorkers: [
        {
          label: 'graphql',
          entry: 'monaco-graphql/esm/graphql.worker.js',
        },
      ],
    }),
  ],
});