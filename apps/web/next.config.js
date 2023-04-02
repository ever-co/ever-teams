/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	swcMinify: true,
	images: {
		domains: [
			'dummyimage.com',
			'res.cloudinary.com',
			'localhost',
			'127.0.0.1',
			'cdn-icons-png.flaticon.com', // Remove this domain once Backend Icons list are added
			'api.gauzy.co',
			'apistage.gauzy.co',
			'gauzy.s3.wasabisys.com'
		],
	},
	experimental: {
		appDir: true
	},
};

module.exports = nextConfig;
