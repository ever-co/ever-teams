/** @jest-environment jsdom */

type LoaderModule = typeof import('./jitsi-external-api');

// The SDK types the global as always there; these tests add and remove it
const jitsiApiGlobal = window as unknown as { JitsiMeetExternalAPI?: unknown };

// The loader keeps one load per page: each test gets a fresh module, as a fresh page would
async function freshLoader(): Promise<LoaderModule> {
	jest.resetModules();
	return import('./jitsi-external-api');
}

function apiScripts(): HTMLScriptElement[] {
	return Array.from(document.head.querySelectorAll<HTMLScriptElement>('script[src$="/external_api.js"]'));
}

function defineJitsiApi(): unknown {
	const api = function JitsiMeetExternalAPI() {
		return undefined;
	};
	jitsiApiGlobal.JitsiMeetExternalAPI = api;
	return api;
}

afterEach(() => {
	delete jitsiApiGlobal.JitsiMeetExternalAPI;
	document.head.innerHTML = '';
	jest.useRealTimers();
});

describe('normalizeMeetDomain', () => {
	it.each([
		['meet.example.com', 'meet.example.com'],
		['  meet.example.com  ', 'meet.example.com'],
		['https://meet.example.com', 'meet.example.com'],
		['https://meet.example.com/', 'meet.example.com'],
		['http://meet.example.com:8443/', 'meet.example.com:8443'],
		['meet.example.com/tenant/', 'meet.example.com/tenant'],
		['', ''],
		[undefined, '']
	])('reads %p as the host %p', async (value, expected) => {
		const { normalizeMeetDomain } = await freshLoader();

		expect(normalizeMeetDomain(value)).toBe(expected);
	});
});

describe('loadJitsiExternalApi', () => {
	it('refuses a missing meeting host without adding a script', async () => {
		const { loadJitsiExternalApi } = await freshLoader();

		await expect(loadJitsiExternalApi('')).rejects.toMatchObject({
			name: 'JitsiApiLoadError',
			reason: 'not-configured'
		});
		expect(apiScripts()).toHaveLength(0);
	});

	it("resolves with the API the server's script defines", async () => {
		const { loadJitsiExternalApi } = await freshLoader();

		const loading = loadJitsiExternalApi('meet.example.com');
		const [script] = apiScripts();
		expect(script.src).toBe('https://meet.example.com/external_api.js');
		const api = defineJitsiApi();
		script.dispatchEvent(new Event('load'));

		await expect(loading).resolves.toBe(api);
	});

	it('reports a server that cannot be reached and takes its script off the page', async () => {
		const { loadJitsiExternalApi } = await freshLoader();

		const loading = loadJitsiExternalApi('meet.example.com');
		apiScripts()[0].dispatchEvent(new Event('error'));

		await expect(loading).rejects.toMatchObject({ reason: 'unreachable', domain: 'meet.example.com' });
		expect(apiScripts()).toHaveLength(0);
	});

	it('reports a server that does not answer in time', async () => {
		const { loadJitsiExternalApi } = await freshLoader();
		jest.useFakeTimers();

		const loading = loadJitsiExternalApi('meet.example.com', 1_000);
		jest.advanceTimersByTime(1_000);

		await expect(loading).rejects.toMatchObject({ reason: 'timeout' });
		expect(apiScripts()).toHaveLength(0);
	});

	it('reports a page that does not define the Jitsi API', async () => {
		const { loadJitsiExternalApi } = await freshLoader();

		const loading = loadJitsiExternalApi('meet.example.com');
		apiScripts()[0].dispatchEvent(new Event('load'));

		await expect(loading).rejects.toMatchObject({ reason: 'invalid' });
	});

	it('shares one script between the loads it is asked for at once', async () => {
		const { loadJitsiExternalApi } = await freshLoader();

		const first = loadJitsiExternalApi('meet.example.com');
		const second = loadJitsiExternalApi('meet.example.com');
		expect(second).toBe(first);
		expect(apiScripts()).toHaveLength(1);

		defineJitsiApi();
		apiScripts()[0].dispatchEvent(new Event('load'));
		await expect(first).resolves.toBeDefined();
	});

	it('asks the server again after a failure, unlike the SDK', async () => {
		const { loadJitsiExternalApi } = await freshLoader();

		const failed = loadJitsiExternalApi('meet.example.com');
		const [firstScript] = apiScripts();
		firstScript.dispatchEvent(new Event('error'));
		await expect(failed).rejects.toMatchObject({ reason: 'unreachable' });

		const retried = loadJitsiExternalApi('meet.example.com');
		const [secondScript] = apiScripts();
		expect(secondScript).not.toBe(firstScript);
		const api = defineJitsiApi();
		secondScript.dispatchEvent(new Event('load'));

		await expect(retried).resolves.toBe(api);
	});

	it('uses an API already on the page without loading it again', async () => {
		const { loadJitsiExternalApi } = await freshLoader();
		const api = defineJitsiApi();

		await expect(loadJitsiExternalApi('meet.example.com')).resolves.toBe(api);
		expect(apiScripts()).toHaveLength(0);
	});
});
