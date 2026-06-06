import type { Preview } from '@storybook/nextjs-vite';
import { TeamsProvider, TeamsLoginDialog, ThemeToggle } from '@ever-teams/atoms';
import './style.css';
import { Decorator } from '@storybook/nextjs-vite';
import { Toaster } from '@ever-teams/toolkit-ui';

const TEAMS_API_URL = process.env.STORYBOOK_TEAMS_API_URL || 'https://api.ever.team/api';

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
