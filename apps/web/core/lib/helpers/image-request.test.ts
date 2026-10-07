import {
	getRuntimeImageHosts,
	isImageOptimizerRequest,
	resolveImageRequest,
	splitImageHostList
} from './image-request';
import { DEFAULT_IMAGE_HOSTS, serializeImageRemotePatterns } from '@/image-hosts';

// What next.config.js exposes as EVER_TEAMS_OPTIMIZED_IMAGE_HOSTS for a default build.
const BUILD_HOSTS = splitImageHostList(
	serializeImageRemotePatterns([
		{ protocol: 'http', hostname: '127.0.0.1', port: '3000' },
		{ protocol: 'http', hostname: 'localhost', port: '3030' },
		{ protocol: 'http', hostname: '127.0.0.1', port: '3030' },
		...DEFAULT_IMAGE_HOSTS.map((hostname: string) => ({ protocol: 'https', hostname, port: '' }))
	])
);
const RUNTIME_HOSTS = [
	'minio.selfhost.example',
	'http://minio.selfhost.example:9000',
	'*.cdn.selfhost.example',
	'https://api.selfhost.example/api'
];

const resolve = (url: string | string[] | null, runtimeHosts: string[] = RUNTIME_HOSTS) =>
	resolveImageRequest(url, BUILD_HOSTS, runtimeHosts);

describe('resolveImageRequest', () => {
	it('lets the optimizer serve relative (same-origin) images', () => {
		expect(resolve('/assets/cover/auth-bg-cover.png')).toBe('optimize');
		expect(resolve('/_next/static/media/logo.svg')).toBe('optimize');
	});

	it('lets the optimizer serve https images from build-time hosts', () => {
		expect(resolve('https://api.ever.team/public/avatar.png')).toBe('optimize');
		expect(resolve('https://gauzy.s3.wasabisys.com/screenshots/1.png')).toBe('optimize');
		expect(resolve('https://API.EVER.TEAM/public/avatar.png')).toBe('optimize');
	});

	it('keeps build-time hosts over http on the optimizer (unchanged behaviour)', () => {
		expect(resolve('http://api.ever.team/public/avatar.png')).toBe('optimize');
		expect(resolve('https://api.ever.team:8443/public/avatar.png')).toBe('optimize');
	});

	it('keeps the static local http patterns on the optimizer', () => {
		expect(resolve('http://127.0.0.1:3000/public/a.png', ['127.0.0.1'])).toBe('optimize');
		expect(resolve('http://localhost:3030/assets/a.png', ['localhost'])).toBe('optimize');
		// A host the build-time list names is never redirected, whatever the port.
		expect(resolve('http://localhost:3000/public/a.png', ['http://localhost:3000'])).toBe('optimize');
	});

	it('never turns a build-time host into a redirect target, even when the runtime env names it', () => {
		// Ever's deployments set NEXT_PUBLIC_GAUZY_API_SERVER_URL=https://api.ever.team at runtime.
		const everRuntime = ['https://api.ever.team', 'api.ever.team', '*.ever.team', 'res.cloudinary.com'];
		expect(resolve('http://api.ever.team/anything', everRuntime)).toBe('optimize');
		expect(resolve('https://api.ever.team:8443/anything', everRuntime)).toBe('optimize');
		expect(resolve('https://res.cloudinary.com/someone-else/image.png', everRuntime)).toBe('optimize');
	});

	it('redirects http and https images whose host is allowed only at runtime', () => {
		expect(resolve('https://minio.selfhost.example/bucket/avatar.png?v=2')).toEqual({
			redirect: 'https://minio.selfhost.example/bucket/avatar.png?v=2'
		});
		// http / non-default ports need an explicit origin entry (http://minio.selfhost.example:9000).
		expect(resolve('http://minio.selfhost.example:9000/bucket/avatar.png')).toEqual({
			redirect: 'http://minio.selfhost.example:9000/bucket/avatar.png'
		});
		// Host taken from a full URL entry (e.g. the API server URL).
		expect(resolve('https://api.selfhost.example/public/uploads/team.png')).toEqual({
			redirect: 'https://api.selfhost.example/public/uploads/team.png'
		});
	});

	it('requires the protocol and port of the runtime rule', () => {
		// A bare host means https on the default port, like a build-time remotePatterns hostname.
		expect(resolve('http://minio.selfhost.example/bucket/a.png', ['minio.selfhost.example'])).toBe('optimize');
		expect(resolve('https://minio.selfhost.example:8443/a.png', ['minio.selfhost.example'])).toBe('optimize');
		expect(resolve('https://minio.selfhost.example:8443/a.png', ['minio.selfhost.example:8443'])).toEqual({
			redirect: 'https://minio.selfhost.example:8443/a.png'
		});
		// A full URL entry allows exactly that origin.
		expect(resolve('http://api.selfhost.example/public/a.png')).toBe('optimize');
		expect(resolve('https://api.selfhost.example:8443/public/a.png')).toBe('optimize');
		expect(resolve('http://minio.selfhost.example:9001/a.png')).toBe('optimize');
	});

	it('matches runtime hosts case-insensitively and redirects to the normalized URL', () => {
		expect(resolve('HTTPS://MinIO.SelfHost.Example/bucket/a b.png')).toEqual({
			redirect: 'https://minio.selfhost.example/bucket/a%20b.png'
		});
		expect(resolve('https://minio.selfhost.example/x.png', ['MINIO.SELFHOST.EXAMPLE'])).toEqual({
			redirect: 'https://minio.selfhost.example/x.png'
		});
	});

	it('supports a leading *. wildcard for subdomains only', () => {
		expect(resolve('https://eu.cdn.selfhost.example/a.png')).toEqual({
			redirect: 'https://eu.cdn.selfhost.example/a.png'
		});
		expect(resolve('https://a.b.cdn.selfhost.example/a.png')).toEqual({
			redirect: 'https://a.b.cdn.selfhost.example/a.png'
		});
		expect(resolve('https://cdn.selfhost.example/a.png')).toBe('optimize');
		expect(resolve('https://evilcdn.selfhost.example/a.png')).toBe('optimize');
	});

	it('supports wildcards in the build-time list too', () => {
		expect(resolveImageRequest('https://x.s3.example.org/a.png', ['*.s3.example.org'], ['x.s3.example.org'])).toBe(
			'optimize'
		);
		expect(resolveImageRequest('https://s3.example.org/a.png', ['*.s3.example.org'], ['s3.example.org'])).toEqual({
			redirect: 'https://s3.example.org/a.png'
		});
	});

	it('leaves hosts allowed nowhere to the optimizer (which rejects them, as before)', () => {
		expect(resolve('https://evil.example/a.png')).toBe('optimize');
		expect(resolve('https://minio.selfhost.example.evil.example/a.png')).toBe('optimize');
		expect(resolve('https://minio.selfhost.example/a.png', [])).toBe('optimize');
	});

	it('never redirects non-http(s), protocol-relative or malformed URLs', () => {
		expect(resolve('javascript:alert(1)', ['alert(1)', 'javascript'])).toBe('optimize');
		expect(resolve('data:image/png;base64,AAAA')).toBe('optimize');
		expect(resolve('ftp://minio.selfhost.example/a.png')).toBe('optimize');
		expect(resolve('//minio.selfhost.example/a.png')).toBe('optimize');
		expect(resolve('https://')).toBe('optimize');
		expect(resolve('not a url')).toBe('optimize');
		expect(resolve('minio.selfhost.example/a.png')).toBe('optimize');
		expect(resolve('')).toBe('optimize');
		expect(resolve(null)).toBe('optimize');
	});

	it('never redirects URLs carrying credentials', () => {
		expect(resolve('https://user:pass@minio.selfhost.example/a.png')).toBe('optimize');
		expect(resolve('https://user@minio.selfhost.example/a.png')).toBe('optimize');
		// The host is what the browser would really contact, not what precedes the "@".
		expect(resolve('https://minio.selfhost.example@evil.example/a.png')).toBe('optimize');
	});

	it('only accepts a single url parameter', () => {
		expect(resolve(['https://minio.selfhost.example/a.png'])).toEqual({
			redirect: 'https://minio.selfhost.example/a.png'
		});
		expect(resolve(['https://minio.selfhost.example/a.png', 'https://evil.example/a.png'])).toBe('optimize');
		expect(resolve([])).toBe('optimize');
	});

	it('redirects to the host the URL parser resolved, never to a look-alike', () => {
		const decision = resolve('https:\\\\minio.selfhost.example\\a.png');
		expect(decision).toEqual({ redirect: 'https://minio.selfhost.example/a.png' });
		expect(resolve('https://minio.selfhost.example%2F@evil.example/a.png')).toBe('optimize');
	});

	it('ignores unusable allowlist entries', () => {
		const runtimeHosts = ['', ' ', 'user@minio.selfhost.example', 'ftp://minio.selfhost.example', '*'];
		expect(resolve('https://minio.selfhost.example/a.png', runtimeHosts)).toBe('optimize');
		// A bare build-time entry with a port never matches in next.config either.
		expect(resolveImageRequest('https://minio.local/a.png', ['minio.local:9000'], [])).toBe('optimize');
		expect(resolveImageRequest('https://minio.local/a.png', ['minio.local:9000'], ['minio.local'])).toEqual({
			redirect: 'https://minio.local/a.png'
		});
	});
});

describe('isImageOptimizerRequest', () => {
	it('recognizes the optimizer endpoint the way Next does', () => {
		expect(isImageOptimizerRequest('/_next/image')).toBe(true);
		expect(isImageOptimizerRequest('/_next/image/')).toBe(true);
		expect(isImageOptimizerRequest('/')).toBe(false);
		expect(isImageOptimizerRequest('/en/_next/image')).toBe(false);
		expect(isImageOptimizerRequest('/_next/static/chunks/main.js')).toBe(false);
	});
});

describe('splitImageHostList', () => {
	it('splits, trims and drops empty entries', () => {
		expect(splitImageHostList(' a.example , ,b.example,')).toEqual(['a.example', 'b.example']);
		expect(splitImageHostList('')).toEqual([]);
		expect(splitImageHostList(undefined)).toEqual([]);
	});
});

describe('getRuntimeImageHosts', () => {
	const envReader = (env: Record<string, string | undefined>) => (name: string) => env[name];

	it('combines NEXT_PUBLIC_IMAGES_HOSTS with the absolute public API, logo and picture URLs', () => {
		const hosts = getRuntimeImageHosts(
			envReader({
				NEXT_PUBLIC_IMAGES_HOSTS: 'minio.selfhost.example, *.cdn.selfhost.example',
				NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'http://192.168.1.10:3000',
				// Server-only internal URL: never a source of browser images.
				GAUZY_API_SERVER_URL: 'http://gauzy-api:3000',
				APP_LOGO_URL: 'https://logo.selfhost.example/logo.png',
				MAIN_PICTURE: '/assets/cover/auth-bg-cover.png',
				MAIN_PICTURE_DARK: ''
			})
		);

		expect(hosts).toEqual([
			'minio.selfhost.example',
			'*.cdn.selfhost.example',
			'http://192.168.1.10:3000',
			'https://logo.selfhost.example/logo.png'
		]);
		expect(resolveImageRequest('http://192.168.1.10:3000/public/a.png', BUILD_HOSTS, hosts)).toEqual({
			redirect: 'http://192.168.1.10:3000/public/a.png'
		});
		expect(resolveImageRequest('http://gauzy-api:3000/public/a.png', BUILD_HOSTS, hosts)).toBe('optimize');
		expect(resolveImageRequest('https://logo.selfhost.example/other.png', BUILD_HOSTS, hosts)).toEqual({
			redirect: 'https://logo.selfhost.example/other.png'
		});
	});

	it('is empty when the runtime env names no image host', () => {
		expect(getRuntimeImageHosts(envReader({}))).toEqual([]);
	});

	it('reads the live runtime env by default', () => {
		const previous = process.env.NEXT_PUBLIC_IMAGES_HOSTS;
		process.env.NEXT_PUBLIC_IMAGES_HOSTS = 'runtime-only.selfhost.example';
		try {
			expect(getRuntimeImageHosts()).toContain('runtime-only.selfhost.example');
		} finally {
			if (previous === undefined) delete process.env.NEXT_PUBLIC_IMAGES_HOSTS;
			else process.env.NEXT_PUBLIC_IMAGES_HOSTS = previous;
		}
	});
});
