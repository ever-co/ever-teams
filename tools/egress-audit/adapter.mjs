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
// - uiLogin: signs in through the web app's password sign-in page, then proves the session works (a
//   walk that is not signed in fails the run).
// - routeParams: the ids only a run knows.

// Plain http on purpose: the compose service inside the sealed audit network, never a public host.
const API = 'http://api:3000'; // NOSONAR
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
	EVER_STATS_API_URL: 'http://10.255.255.1:8080', // NOSONAR: a private address nothing answers on
	EVER_STATS_SEND_INTERVAL_S: '5'
};

/**
 * The reporter interval of `loaded_off`: the first question 10 minutes after the start, as in
 * production, then every 10 minutes. The config's wait_s (660) is longer than one interval, so at least
 * one question is asked after the operator's switch-off and inside the watched window; the workflow
 * then requires the log line of that question (`skipped_gauzy_off`), so a run in which the reporter
 * never asked cannot pass.
 */
const LOADED_OFF_INTERVAL_S = '600';

/** The web app's Ever Platform routes, with the method (and body) its settings use. */
const MODULE_ROUTES = [
	['GET', '/api/ever-stats/status'],
	['GET', '/api/ever-stats/last'],
	['PUT', '/api/ever-stats/enabled', { enabled: true }],
	['GET', '/api/ever-connect/health'],
	['GET', '/api/ever-connect/status'],
	['GET', '/api/ever-connect/integrations'],
	['GET', '/api/ever-connect/entitlement'],
	['POST', '/api/ever-connect/links', {}]
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

/**
 * Signs the seeded super admin in at the paired API (`POST /auth/login`): its token, refresh token and
 * user. (`/auth/signin.email.password` answers the workspaces to choose from, not a session.)
 */
async function signIn(fetchImpl, password) {
	let last = 'no answer';
	// The seed finishes after the API answers health: a few tries.
	for (let attempt = 0; attempt < 30; attempt += 1) {
		try {
			const response = await fetchImpl(`${API}/api/auth/login`, {
				method: 'POST',
				headers: { 'content-type': 'application/json', accept: 'application/json' },
				body: JSON.stringify({ email: ADMIN_EMAIL, password })
			});
			const body = await json(response);
			const token = body?.token;
			if (response.ok && typeof token === 'string' && token) {
				const refresh = body?.refresh_token;
				return { token, refreshToken: typeof refresh === 'string' ? refresh : null, user: body?.user ?? {} };
			}
			last = `HTTP ${response.status}${response.ok ? ' without a token' : ''}`;
		} catch (error) {
			last = String(error?.message ?? error).split('\n')[0];
		}
		await sleep(10_000);
	}
	throw new Error(`the seeded admin could not sign in at the paired API (${last})`);
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
	if (!response.ok) {
		// The API's own message (validation errors name fields, never values): what to fix next time.
		const message = JSON.stringify(data?.message ?? data?.error ?? '').slice(0, 300);
		throw new Error(`${method} ${path} answered HTTP ${response.status} ${message}`);
	}
	return data;
}

function itemsOf(data) {
	if (Array.isArray(data)) return data;
	return Array.isArray(data?.items) ? data.items : [];
}

const describeAnswers = (answers) => answers.map((a) => `${a.route} ${a.status}`).join('; ');

/** The page the sign-in is checked on: a team manager's settings, behind the sign-in. */
const SIGNED_IN_CHECK_PAGE = '/en/settings/team';

/** A path the web app sends a visitor without a session to. */
const SIGNED_OUT_PATH = /\/(auth|unauthorized)(\/|$)/;

const pathOf = (url) => {
	try {
		return new URL(url).pathname;
	} catch {
		return String(url);
	}
};

/** The password sign-in page: e-mail and password, then the workspace step when it asks for one. */
async function signInThroughThePage(page, ctx, password) {
	await page.goto(`${ctx.baseUrl}/en/auth/password`, { waitUntil: 'load', timeout: 120_000 });
	await page.fill('input[name=email]', ADMIN_EMAIL, { timeout: 30_000 });
	await page.fill('input[name=password]', password, { timeout: 30_000 });
	await page.click('button[type=submit]', { timeout: 30_000 });
	const leftTheSignIn = (url) => !SIGNED_OUT_PATH.test(new URL(url).pathname);
	try {
		// One workspace with one team: the page continues on its own.
		await page.waitForURL(leftTheSignIn, { timeout: 45_000 });
	} catch {
		// Otherwise it shows the workspaces, the first one selected: confirm it.
		await page.click('form button[type=submit]:visible', { timeout: 30_000 });
		await page.waitForURL(leftTheSignIn, { timeout: 120_000 });
	}
	await page.waitForLoadState('load');
}

/** The cookies the sign-in page sets, from the paired API's own sign-in. */
async function setSessionCookies(page, ctx, password) {
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
}

/** Opens a page behind the sign-in and throws unless it stays there. */
async function assertSignedIn(page, ctx) {
	const response = await page.goto(`${ctx.baseUrl}${SIGNED_IN_CHECK_PAGE}`, { waitUntil: 'load', timeout: 120_000 });
	const landed = pathOf(page.url());
	if (SIGNED_OUT_PATH.test(landed)) {
		throw new Error(`the test sign-in did not work: ${SIGNED_IN_CHECK_PAGE} ended on ${landed}`);
	}
	const status = response?.status() ?? 0;
	if (status >= 400) throw new Error(`the test sign-in did not work: ${SIGNED_IN_CHECK_PAGE} answered ${status}`);
	if ((await page.locator('input[name=password]').count()) > 0) {
		throw new Error(`the test sign-in did not work: ${SIGNED_IN_CHECK_PAGE} shows a password field`);
	}
}

export default {
	// Every mode sets the web app's statistics switch explicitly (the app's own default is on).
	env: {
		off: {
			...WOULD_SHOW,
			EVER_STATS_ENABLED: 'false',
			NEXT_PUBLIC_EVER_CONNECT_ENABLED: null,
			[ADMIN_PASSWORD_KEY]: adminPassword()
		},
		// The paired API's statistics are on until the operator switches them off (prepareLoadedOff, as soon
		// as the API is up); see LOADED_OFF_INTERVAL_S for why its questions come after that switch.
		loaded_off: {
			EVER_STATS_ENABLED: 'true',
			EVER_STATS_API_URL: WOULD_SHOW.EVER_STATS_API_URL,
			EVER_STATS_SEND_INTERVAL_S: LOADED_OFF_INTERVAL_S,
			NEXT_PUBLIC_EVER_CONNECT_ENABLED: 'true',
			[ADMIN_PASSWORD_KEY]: adminPassword()
		},
		positive_stats: {
			EVER_STATS_ENABLED: 'true',
			NEXT_PUBLIC_EVER_CONNECT_ENABLED: null,
			[ADMIN_PASSWORD_KEY]: adminPassword()
		}
	},

	/** The seeded super admin as a Teams manager: an organization, an employee and a team it manages. */
	async createFixtures({ fetch: fetchImpl, env, log }) {
		await waitForApi(fetchImpl, log);
		const session = await signIn(fetchImpl, env[ADMIN_PASSWORD_KEY]);
		const tenantId = session.user.tenantId;
		const me = await api(fetchImpl, session, tenantId, 'GET', '/user/me?relations[]=employee&relations[]=role');

		let organizationId = me?.employee?.organizationId ?? me?.lastOrganizationId ?? me?.defaultOrganizationId ?? null;
		if (!organizationId) {
			// The organization the web app opens for this person: the first of their user organizations
			// (the query the web app itself sends), so the team made below is the one it shows.
			try {
				const query = new URLSearchParams({
					'where[userId]': me.id,
					'where[tenantId]': tenantId,
					'relations[0]': 'organization'
				});
				const links = itemsOf(await api(fetchImpl, session, tenantId, 'GET', `/user-organization?${query}`));
				organizationId = links.find((link) => link?.organizationId)?.organizationId ?? null;
			} catch (error) {
				log(`adapter: listing the user's organizations failed (${error.message}); creating one`);
			}
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
		const members = itemsOf(team?.members).length;
		log(`adapter: fixtures ready (organization ${organizationId === me?.employee?.organizationId ? 'of the employee' : 'resolved'}, employee ${me?.employee?.id ? 'existing' : 'created'}, team with ${members} member(s))`);
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
		for (const [method, path, body] of MODULE_ROUTES) {
			const response = await fetchImpl(`${baseUrl}${path}`, {
				method,
				redirect: 'manual',
				headers: body === undefined ? {} : { 'content-type': 'application/json' },
				body: body === undefined ? undefined : JSON.stringify(body)
			});
			answers.push({ route: `${method} ${path}`, status: response.status });
		}
		log(`adapter: ${describeAnswers(answers)}`);
		if (mode !== 'off') return;
		const answered = answers.filter((a) => a.status !== 404);
		if (answered.length > 0) {
			throw new Error(`with the Ever Platform modules off every route must answer 404: ${describeAnswers(answered)}`);
		}
	},

	/**
	 * Signs in through the web app's password sign-in page, as a person would: e-mail and password, then
	 * the workspace (chosen automatically for a single workspace with a single team, else confirmed here).
	 * Should that page not finish (a release that changed it), the session cookies the page would set are
	 * set from the paired API's own sign-in instead, so the walk still covers every signed-in page; the log
	 * says which happened. Either way the hook then opens a signed-in page and throws when it ends on a
	 * sign-in or "unauthorized" page: a run whose walk was not signed in is a fault, never a pass.
	 */
	async uiLogin(page, ctx) {
		const password = ctx.env[ADMIN_PASSWORD_KEY];
		if (!password) throw new Error(`${ADMIN_PASSWORD_KEY} is not in the mode env: the sign-in cannot be tested`);
		let how = 'the sign-in page';
		try {
			await signInThroughThePage(page, ctx, password);
		} catch (error) {
			const reason = String(error?.message ?? error).split('\n')[0];
			ctx.log(`adapter: the sign-in page did not finish (${reason}); setting the session cookies instead`);
			await setSessionCookies(page, ctx, password);
			how = 'the session cookies';
		}
		await assertSignedIn(page, ctx);
		ctx.log(`adapter: signed in with ${how}; ${SIGNED_IN_CHECK_PAGE} opened signed in`);
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
