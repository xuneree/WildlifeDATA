import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({resolve:{alias:{react:fileURLToPath(new URL('./node_modules/react',import.meta.url)),'react-dom':fileURLToPath(new URL('./node_modules/react-dom',import.meta.url))}},build:{rollupOptions:{onwarn(warning,defaultHandler){if(warning.code==='MODULE_LEVEL_DIRECTIVE'&&warning.message.includes('use client'))return;defaultHandler(warning);}}}});
