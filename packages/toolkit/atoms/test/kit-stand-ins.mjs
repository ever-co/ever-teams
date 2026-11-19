// What a test that renders TeamsProvider with the kit's hooks and the built @ever-teams/api gives it instead of the UI
// packages and the translations, and a stand-in API that records every request: the atoms and embed tests share them.
// Not a test itself: node --test runs *.test.mjs only.
const passThrough = 'export default ({ children }) => children;';
const children = '({ children }) => children ?? null';
export const kitStandIns = {
	'@ever-teams/toolkit-ui': `import { createContext, createElement } from 'react';
		export const PortalContainerContext = createContext(null);
		export const Avatar = () => null;
		export const Button = ${children};
		export const Card = ${children};
		export const Checkbox = () => null;
		export const Dialog = ${children};
		export const Input = () => null;
		export const Popover = ${children};
		export const PopoverContent = () => null;
		export const PopoverTrigger = ${children};
		export const Tabs = ${children};
		export const TabsContent = ${children};
		export const TabsListThemed = ${children};
		export const TabsTrigger = ${children};
		export const ThemedButton = ${children};
		export const useThemeColor = () => 'purple';
		export const cn = (...names) => names.filter(Boolean).join(' ');
		export const Toaster = () => null;
		export const toast = () => {};
		export const reportError = () => {};
		export const getErrorMessage = (error) => String(error);
		export const getWeekStartAndEnd = () => ({ start: new Date(0), end: new Date(0) });
		export const getStartAndEndOfDay = () => ({ dayStart: '', dayEnd: '' });
		export const generateChartConfig = () => ({});
		export const transformData = () => [];`,
	'theme-ui': `const passThrough = ({ children }) => children;
		export const ThemeUIProvider = passThrough;`,
	// The sign-out menu is written for theme-ui's JSX, which adds the sx prop to React's.
	'theme-ui/jsx-runtime': "export { jsx, jsxs, Fragment } from 'react/jsx-runtime';",
	'lucide-react': `export const CheckIcon = () => null;
		export const Copy = () => null;
		export const LoaderCircle = () => null;
		export const LogOutIcon = () => null;`,
	'next-themes': `const passThrough = ({ children }) => children;
		export const ThemeProvider = passThrough;
		export const useTheme = () => ({ setTheme() {} });`,
	'react-i18next': `export const useTranslation = () => ({ t: (key) => key });
		export const I18nextProvider = ({ children }) => children;`,
	'@lib/i18n/init': 'export default {};',
	'@hooks/useProviderLanguage': 'export const useProviderLanguage = () => {};',
	'@hooks/useFontSelector': 'export default () => ({ fontOptions: [], selectedFont: "", setSelectedFont() {} });',
	'@lib/context/teams-tracking-context': passThrough
};
// The stand-in an import names, as the kit's modules write it.
export const kitStandInOf = (importPath) => Object.keys(kitStandIns).find((name) => importPath === name);

const USER = { id: 'user-1', tenantId: 'tenant-1', employee: { id: 'employee-1', organizationId: 'org-1' } };
// What the stand-in API answers, by the path under /api; anything else gets an empty object.
const ANSWERS = {
	'/auth/login': { token: 'token-1', refresh_token: 'refresh-1', user: USER },
	'/user/me': USER,
	'/role-permissions/me': [],
	'/user-organization': { items: [{ organizationId: 'org-1', isDefault: true }], total: 1 },
	'/timesheet/timer/status': { duration: 0, running: false, lastLog: null }
};

// A fetch that answers the kit's requests from ANSWERS and records each one's host, path and method in `requests`.
export function recordingFetch(requests) {
	return async (url, init) => {
		const { host, pathname } = new URL(url);
		const path = pathname.replace(/^\/api/, '');
		requests.push({ host, path, method: init?.method ?? 'GET' });
		const body = ANSWERS[path] ?? {};
		return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
	};
}

// Servers behind one fetch that each check the tokens they get, as a real API refuses (401) a token it did not issue:
// a sign-in on a host issues that host's own token. Each request is recorded with its host, path and method, whether it
// carried an Authorization header, and the status answered; never the token itself.
export function tokenCheckingServers() {
	const requests = [];
	const accepted = new Map();
	const accept = (host, token) => {
		const tokens = accepted.get(host) ?? new Set();
		tokens.add(token);
		accepted.set(host, tokens);
	};
	// The host ends every session it issued: their tokens are refused from then on.
	const revoke = (host) => accepted.delete(host);
	const isAccepted = (host, authorization) => {
		const token = authorization.replace(/^Bearer /, '');
		return accepted.get(host)?.has(token) ?? false;
	};
	const fetch = async (url, init) => {
		const { host, pathname } = new URL(url);
		const path = pathname.replace(/^\/api/, '');
		const authorization = new Headers(init?.headers).get('authorization');
		let status = 200;
		let body = ANSWERS[path] ?? {};
		if (path === '/auth/login') {
			const token = `${host}-token`;
			accept(host, token);
			body = { ...body, token };
		}
		const refused = authorization !== null && !isAccepted(host, authorization);
		if (refused) {
			status = 401;
			body = { statusCode: 401, message: 'Unauthorized' };
		}
		requests.push({ host, path, method: init?.method ?? 'GET', authorized: authorization !== null, status });
		return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
	};
	return { requests, accept, revoke, fetch };
}
