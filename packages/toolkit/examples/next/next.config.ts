import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
	/* config options here */
	// --- ever-k8s: force Next standalone output for containerization ---
	// Monorepo root is four levels up from packages/toolkit/examples/next.
	output: 'standalone',
	outputFileTracingRoot: path.join(__dirname, '../../../..')
};

export default nextConfig;
