/**
 * Test-only (never part of the app): one route handler of the web app run against a stand-in of the Gauzy API. Created
 * at the top of a test file, it starts the stand-in for that file, gives it its default answers and quiet logs before
 * each test, and puts the environment back at the end.
 */
import { NextRequest } from 'next/server';
import { MockGauzyApi } from '@/test/ever-id/mock-gauzy-api';
import { captureConsole } from '@/test/server-logs';

export class RouteAgainstGauzy<RouteModule> {
	readonly gauzy = new MockGauzyApi();
	private readonly environmentBefore = { ...process.env };

	/** `requireRoute` is the test file's own `jest.requireActual('./route')`, so the path stays relative to it. */
	constructor(private readonly requireRoute: () => RouteModule) {
		beforeAll(() => this.gauzy.start());
		beforeEach(() => {
			this.gauzy.reset();
			captureConsole();
		});
		afterEach(() => jest.restoreAllMocks());
		afterAll(() => this.stopGauzy());
	}

	/** The route module, loaded anew: it reads the API address when it loads, and that address is the stand-in's. */
	load(): RouteModule {
		process.env.GAUZY_API_SERVER_URL = this.gauzy.origin;
		let route: RouteModule | undefined;
		jest.isolateModules(() => {
			route = this.requireRoute();
		});
		return route as RouteModule;
	}

	/** A JSON POST as Next hands it to the handler. */
	jsonPost(url: string, body: Record<string, unknown>): NextRequest {
		const headers = { 'content-type': 'application/json' };
		return new NextRequest(url, { method: 'POST', headers, body: JSON.stringify(body) });
	}

	private async stopGauzy(): Promise<void> {
		await this.gauzy.stop();
		process.env = this.environmentBefore;
	}
}
