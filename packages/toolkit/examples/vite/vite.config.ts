import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
	plugins: [tailwindcss(), react()] as any[],
	define: {
		'process.env.NODE_ENV': JSON.stringify('development') // or 'production'
	}
});
