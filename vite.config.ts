import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 部署需要 base path。
// 仓库名为 <owner>/<repo>，Pages URL 形如 https://<owner>.github.io/<repo>/
// 因此 base 必须设为 "/<repo>/"，否则资源路径会 404。
// 当仓库名为 <owner>.github.io 时，base 应为 "/"。
// 通过环境变量 PAGE_BASE 覆盖，默认 "/Minesweeper/"。
const BASE = process.env.PAGE_BASE ?? '/Minesweeper/';

export default defineConfig({
  base: BASE,
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});
