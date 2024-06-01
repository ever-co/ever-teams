/** @type {import('next').NextConfig} */
const withNextIntl = require('next-intl/plugin')();
module.exports = {
  trailingSlash: true,
  reactStrictMode: false,
	swcMinify: true,
  images: {
    unoptimized: true,
  },
  output: 'export',
  webpack: (config) => {
    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', 'css-loader', 'postcss-loader'],
    });
    return config
  },
}
