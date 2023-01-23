/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["dummyimage.com","res.cloudinary.com", "localhost", "127.0.0.1"],
  },
};

module.exports = nextConfig;
