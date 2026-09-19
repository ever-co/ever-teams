/* global module */

/**
 * next/image hosts, shared by next.config.js (build time) and proxy.ts (runtime, through
 * core/lib/helpers/image-request.ts).
 *
 * CommonJS on purpose: next.config.js `require`s it before anything is compiled.
 *
 * next.config.js turns these hosts into `images.remotePatterns` at BUILD time, and the standalone
 * server serializes that config into server.js, so a published Docker image only ever OPTIMIZES the
 * hosts it was built with. Hosts added at runtime (container env) are served unoptimized instead:
 * proxy.ts redirects the `/_next/image` request to the original image (see image-request.ts).
 */

// Default hosts if NEXT_PUBLIC_IMAGES_HOSTS is not set
const DEFAULT_IMAGE_HOSTS = [
	'dummyimage.com',
	'res.cloudinary.com',
	'gauzy.sfo2.digitaloceanspaces.com',
	'cdn-icons-png.flaticon.com',
	'api.gauzy.co',
	'apida.gauzy.co',
	'apicw.gauzy.co',
	'apicivo.gauzy.co',
	'apidev.gauzy.co',
	'apidemo.gauzy.co',
	'apidemocw.gauzy.co',
	'apidemodt.gauzy.co',
	'apidemodts.gauzy.co',
	'apidemocivo.gauzy.co',
	'apidemoda.gauzy.co',
	'apistage.gauzy.co',
	'apistagecivo.gauzy.co',
	'apistagecw.gauzy.co',
	'apistageda.gauzy.co',
	'apistagedt.gauzy.co',
	'apistagedts.gauzy.co',
	'api.ever.team',
	'app.ever.team',
	'apidev.ever.team',
	'gauzy.s3.wasabisys.com',
	'gauzystage.s3.wasabisys.com'
];

/**
 * The hosts of a NEXT_PUBLIC_IMAGES_HOSTS value (comma separated), or DEFAULT_IMAGE_HOSTS when it is
 * unset or empty. Entries are trimmed and otherwise kept as written: this is exactly what
 * next.config.js always did, so the build-time remotePatterns stay byte-for-byte the same.
 *
 * @param {string | undefined} value
 * @returns {string[]}
 */
function parseImageHosts(value) {
	if (!value) {
		return [...DEFAULT_IMAGE_HOSTS];
	}
	return value.split(',').map((host) => host.trim());
}

/**
 * Serializes `images.remotePatterns` for runtime code (next.config.js `env`
 * EVER_TEAMS_OPTIMIZED_IMAGE_HOSTS), as a comma list that image-request.ts parses back:
 * - `hostname` for the NEXT_PUBLIC_IMAGES_HOSTS patterns (https, default port);
 * - `protocol://hostname:port` for any other pattern (the local http ones).
 *
 * @param {{ protocol: string, hostname: string, port?: string }[]} remotePatterns
 * @returns {string}
 */
function serializeImageRemotePatterns(remotePatterns) {
	return remotePatterns
		.map(({ protocol, hostname, port }) =>
			protocol === 'https' && !port ? hostname : `${protocol}://${hostname}${port ? `:${port}` : ''}`
		)
		.join(',');
}

module.exports = { DEFAULT_IMAGE_HOSTS, parseImageHosts, serializeImageRemotePatterns };
