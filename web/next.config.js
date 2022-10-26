/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  serverRuntimeConfig: {
    gauzy_api_server_url: process.env.GAUZY_DEMOAPI_SERVER_URL,
    gauz_demoapi_server_url: process.env.GAUZY_DEMOAPI_SERVER_URL,
  },
};

module.exports = nextConfig;
