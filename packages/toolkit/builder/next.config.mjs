import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    images:{
        domains: ['i.ibb.co']
    },
    // --- ever-k8s: force Next standalone output for containerization ---
    // Monorepo root is three levels up from packages/toolkit/builder.
    output: 'standalone',
    outputFileTracingRoot: path.join(__dirname, '../../..'),
};

export default nextConfig;
