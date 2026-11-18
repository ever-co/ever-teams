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
