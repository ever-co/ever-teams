import type { Preview } from '@storybook/nextjs-vite';
import { TeamsProvider, TeamsLoginDialog, ThemeToggle } from '@ever-teams/atoms';
import './style.css';
import { Decorator } from '@storybook/nextjs-vite';
import { Toaster } from '@ever-teams/toolkit-ui';

/**
 * Runtime (container) configuration. /runtime-config.js (loaded by .storybook/preview-head.html,
 * before this bundle) publishes the values the container was started with. Storybook's Vite builder
 * freezes `import.meta.env.STORYBOOK_*` at build time and the published image is a static bundle
 * behind nginx, so that script is the only way `docker run -e STORYBOOK_TEAMS_API_URL=...` can work.
 * The build-time value stays as the fallback for `yarn dev` and `yarn build`.
 *
 * Note: `process.env.STORYBOOK_*` is NOT substituted by builder-vite (it emits `import.meta.env.*`)
 * and `process` is not defined in the browser bundle — do not go back to it.
 */
type RuntimeEnv = Record<string, string | undefined>;
const runtimeEnv = (globalThis as { __EVER_TEAMS_RUNTIME_ENV__?: RuntimeEnv }).__EVER_TEAMS_RUNTIME_ENV__;

const TEAMS_API_URL =
	runtimeEnv?.STORYBOOK_TEAMS_API_URL || import.meta.env.STORYBOOK_TEAMS_API_URL || 'https://api.ever.team/api';

export const TeamsDecorator: Decorator = (Story, context) => {
	return (
		<TeamsProvider config={{ apiUrl: TEAMS_API_URL }}>
			<div className="fixed dark:text-white right-0  z-[49]  top-0  flex justify-between gap-4  p-4  items-center">
				<ThemeToggle />
				<TeamsLoginDialog />
			</div>

			<Story {...context} />

			<Toaster />
		</TeamsProvider>
	);
};

export const decorators = [TeamsDecorator];

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		}
	}
};

export default preview;
