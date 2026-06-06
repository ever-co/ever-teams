import { ThemeToggle } from '@ever-teams/atoms';
import { useRemixTeamsContext } from './remix-teams-provider';
import { ThemeProvider } from 'next-themes';

export function ThemeToggleWrapper() {
	const { theme } = useRemixTeamsContext();

	return (
		<ThemeProvider attribute="class" defaultTheme={theme}>
			<ThemeToggle />
		</ThemeProvider>
	);
}
