// Ever Teams' adapter for the Ever Platform egress audit (see README.md).
//
// The audit's driver runs the API hooks inside the sealed audit setup, and the browser runs the
// browser hooks in its own sniffed namespace: both reach the web app as `webapp` and the paired API as
// `api`, by compose service name.
//
// - createFixtures: the seeded super admin of the paired API gets what a Teams manager has (an
//   organization, an employee, a team it manages); answers the ids the browser leg needs, never a token.
// - prepareLoadedOff: that admin, the installation's operator, switches the anonymous usage statistics
//   off in the paired API, where Teams reads the switch before every report.
// - openSettings: every Ever Platform route of the web app, with its own method; in `off` each must
//   answer 404.
// - uiLogin: signs in through the web app's password sign-in page.
// - routeParams: the ids only a run knows.

const API = 'http://api:3000';
const ADMIN_EMAIL = 'admin@ever.co';
const PLACEHOLDER_ID = '00000000-0000-4000-8000-000000000000';
const API_READY_TIMEOUT_MS = 25 * 60 * 1000;

/** The seeded super admin's password: a random value of this run, given to the hooks through the mode env. */
const ADMIN_PASSWORD_KEY = 'TEAMS_AUDIT_ADMIN_PASSWORD';

/**
 * A short reporter interval and a local address (outside the sealed setup) to report to, so that a
 * reporter loaded or sending by mistake would try within the watched window and be seen.
 */
const WOULD_SHOW = {
	EVER_STATS_API_URL: 'http://10.255.255.1:8080',
	EVER_STATS_SEND_INTERVAL_S: '5'
};

/** The web app's Ever Platform routes, with the method its settings use. */
const MODULE_ROUTES = [
	['GET', '/api/ever-stats/status'],
	['GET', '/api/ever-stats/last'],
	['PUT', '/api/ever-stats/enabled'],
	['GET', '/api/ever-connect/health'],
	['GET', '/api/ever-connect/status'],
	['GET', '/api/ever-connect/integrations'],
	['GET', '/api/ever-connect/entitlement'],
	['POST', '/api/ever-connect/links']
];

const adminPassword = () => process.env[ADMIN_PASSWORD_KEY] ?? '';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function json(response) {
	const text = await response.text();
	try {
		return text ? JSON.parse(text) : null;
	} catch {
		return null;
	}
}

/** Waits for the paired API (its first start runs the migrations and the seed). */
async function waitForApi(fetchImpl, log) {
	const deadline = Date.now() + API_READY_TIMEOUT_MS;
	let last = 'no answer';
	while (Date.now() < deadline) {
		try {
			const response = await fetchImpl(`${API}/api/health`);
			if (response.ok) return;
			last = `HTTP ${response.status}`;
		} catch (error) {
			last = String(error?.message ?? error);
		}
		await sleep(5_000);
	}
	log(`adapter: the paired API never answered its health check (${last})`);
	throw new Error('the paired API never became ready');
}

/** Signs the seeded super admin in at the paired API: its token, refresh token and user. */
async function signIn(fetchImpl, password) {
	let lastStatus = 0;
	// The seed finishes after the API answers health: a few tries.
	for (let attempt = 0; attempt < 30; attempt += 1) {
		const response = await fetchImpl(`${API}/api/auth/signin.email.password`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', accept: 'application/json' },
			body: JSON.stringify({ email: ADMIN_EMAIL, password, includeTeams: true })
		});
		lastStatus = response.status;
		const body = await json(response);
		const token = body?.token ?? body?.access_token ?? body?.data?.token;
		if (response.ok && typeof token === 'string') {
			const refresh = body?.refresh_token?.token ?? body?.refresh_token ?? null;
			return { token, refreshToken: typeof refresh === 'string' ? refresh : null, user: body?.user ?? {} };
		}
		await sleep(10_000);
	}
	throw new Error(`the seeded admin could not sign in at the paired API (HTTP ${lastStatus})`);
}

function authHeaders(session, tenantId) {
	return {
		accept: 'application/json',
		'content-type': 'application/json',
		authorization: `Bearer ${session.token}`,
		...(tenantId ? { 'tenant-id': tenantId } : {})
	};
}

async function api(fetchImpl, session, tenantId, method, path, body) {
	const response = await fetchImpl(`${API}/api${path}`, {
		method,
		headers: authHeaders(session, tenantId),
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	const data = await json(response);
	if (!response.ok) throw new Error(`${method} ${path} answered HTTP ${response.status}`);
	return data;
}

const itemsOf = (data) => (Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []);

export default {
	env: {
		off: { ...WOULD_SHOW, NEXT_PUBLIC_EVER_CONNECT_ENABLED: null, [ADMIN_PASSWORD_KEY]: adminPassword() },
		loaded_off: { ...WOULD_SHOW, NEXT_PUBLIC_EVER_CONNECT_ENABLED: 'true', [ADMIN_PASSWORD_KEY]: adminPassword() },
		positive_stats: { NEXT_PUBLIC_EVER_CONNECT_ENABLED: null, [ADMIN_PASSWORD_KEY]: adminPassword() }
	},

	/** The seeded super admin as a Teams manager: an organization, an employee and a team it manages. */
	async createFixtures({ fetch: fetchImpl, env, log }) {
		await waitForApi(fetchImpl, log);
		const session = await signIn(fetchImpl, env[ADMIN_PASSWORD_KEY]);
		const tenantId = session.user.tenantId;
		const me = await api(fetchImpl, session, tenantId, 'GET', '/user/me?relations[]=employee&relations[]=role');

		let organizationId = me?.employee?.organizationId ?? me?.lastOrganizationId ?? me?.defaultOrganizationId ?? null;
		if (!organizationId) {
			const organizations = itemsOf(await api(fetchImpl, session, tenantId, 'GET', `/organization?where[tenantId]=${tenantId}`));
			organizationId = organizations[0]?.id ?? null;
		}
		if (!organizationId) {
			const organization = await api(fetchImpl, session, tenantId, 'POST', '/organization', {
				name: 'Egress audit',
				currency: 'USD',
				tenantId,
				invitesAllowed: true
			});
			organizationId = organization.id;
		}

		let employeeId = me?.employee?.id ?? null;
		if (!employeeId) {
			const employee = await api(fetchImpl, session, tenantId, 'POST', '/employee', {
				organizationId,
				tenantId,
				userId: me.id,
				startedWorkOn: new Date().toISOString()
			});
			employeeId = employee.id;
		}

		const team = await api(fetchImpl, session, tenantId, 'POST', '/organization-team', {
			name: 'Egress audit team',
			tenantId,
			organizationId,
			managerIds: [employeeId],
			memberIds: [],
			public: true
		});
		log(`adapter: fixtures ready (organization, employee, team)`);
		return {
			tenantId,
			organizationId,
			userId: me.id,
			employeeId,
			teamId: team.id,
			profileLink: team.profile_link ?? 'egress-audit-team'
		};
	},

	/** The operator switches the anonymous usage statistics off in the paired API. */
	async prepareLoadedOff({ fetch: fetchImpl, env, log }) {
		await waitForApi(fetchImpl, log);
		const session = await signIn(fetchImpl, env[ADMIN_PASSWORD_KEY]);
		await api(fetchImpl, session, session.user.tenantId, 'PUT', '/ever-stats/enabled', { enabled: false });
		const state = await json(await fetchImpl(`${API}/api/ever-stats/state`));
		if (state?.enabled !== false) throw new Error('the paired API does not report its statistics as switched off');
		log('adapter: the paired API reports its statistics switched off');
	},

	/** Every Ever Platform route of the web app; with the modules off, each must answer 404. */
	async openSettings({ baseUrl, mode, fetch: fetchImpl, log }) {
		const answers = [];
		for (const [method, path] of MODULE_ROUTES) {
			const response = await fetchImpl(`${baseUrl}${path}`, {
				method,
				redirect: 'manual',
				headers: method === 'GET' ? {} : { 'content-type': 'application/json' },
				body: method === 'GET' ? undefined : JSON.stringify(method === 'PUT' ? { enabled: true } : {})
			});
			answers.push({ route: `${method} ${path}`, status: response.status });
		}
		log(`adapter: ${answers.map((a) => `${a.route} ${a.status}`).join('; ')}`);
		if (mode !== 'off') return;
		const answered = answers.filter((a) => a.status !== 404);
		if (answered.length > 0) {
			throw new Error(`with the Ever Platform modules off every route must answer 404: ${answered.map((a) => `${a.route} ${a.status}`).join('; ')}`);
		}
	},

	/**
	 * Signs in through the web app's password sign-in page, as a person would. Should that page not finish
	 * (a release that changed it), the session cookies the page would set are set from the paired API's
	 * own sign-in instead, so the walk still covers every signed-in page; the log says which happened.
	 */
	async uiLogin(page, ctx) {
		const password = ctx.env[ADMIN_PASSWORD_KEY];
		await page.goto(`${ctx.baseUrl}/en/auth/password`, { waitUntil: 'load', timeout: 120_000 });
		try {
			await page.fill('input[name=email]', ADMIN_EMAIL, { timeout: 30_000 });
			await page.fill('input[name=password]', password, { timeout: 30_000 });
			await Promise.all([
				page.waitForURL((url) => !/\/auth\//.test(new URL(url).pathname), { timeout: 120_000 }),
				page.click('button[type=submit]')
			]);
			await page.waitForLoadState('load');
			ctx.log(`adapter: signed in through the sign-in page (now on ${new URL(page.url()).pathname})`);
			return;
		} catch (error) {
			const reason = String(error?.message ?? error).split('\n')[0];
			ctx.log(`adapter: the sign-in page did not finish (${reason}); setting the session cookies instead`);
		}
		const session = await signIn(ctx.fetch, password);
		const fixtures = ctx.fixtures ?? {};
		const cookies = {
			'auth-token': session.token,
			'auth-refresh-token': session.refreshToken,
			'auth-tenant-id': fixtures.tenantId ?? session.user.tenantId,
			'auth-organization-id': fixtures.organizationId,
			'auth-active-team': fixtures.teamId,
			'auth-user-id': fixtures.userId ?? session.user.id,
			'auth-active-language': 'en',
			'no-team-popup-show': 'true'
		};
		await page.context().addCookies(
			Object.entries(cookies)
				.filter(([, value]) => typeof value === 'string' && value)
				.map(([name, value]) => ({ name, value, url: ctx.baseUrl, sameSite: 'Lax' }))
		);
		await page.goto(`${ctx.baseUrl}/en`, { waitUntil: 'load', timeout: 120_000 });
		ctx.log(`adapter: signed in with the session cookies (now on ${new URL(page.url()).pathname})`);
	},

	/** The ids of what createFixtures made; a placeholder for the pages of a project or a task. */
	async routeParams(ctx) {
		const fixtures = ctx.fixtures ?? {};
		return {
			locale: 'en',
			teamId: fixtures.teamId ?? PLACEHOLDER_ID,
			memberId: fixtures.userId ?? PLACEHOLDER_ID,
			profileLink: fixtures.profileLink ?? 'egress-audit-team',
			id: PLACEHOLDER_ID
		};
	}
};
