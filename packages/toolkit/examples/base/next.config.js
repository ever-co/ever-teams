const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	transpilePackages: ['@ever-teams/toolkit-ui', '@ever-teams/atoms']
};

// --- ever-k8s: force Next standalone output for containerization ---
// Monorepo root is four levels up from packages/toolkit/examples/base.
nextConfig.output = 'standalone';
nextConfig.outputFileTracingRoot = path.join(__dirname, '../../../..');

module.exports = nextConfig;
