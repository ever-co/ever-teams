'use client';

import { TeamsThemeToggle, TeamsFontToggle, ThemeToggle } from '@ever-teams/atoms';
import { PageTitle } from '@/components/page-title';
import { ComponentExample } from '@/components/component-example';

export default function ToggleVariants() {
	return (
		<div className="space-y-8">
			<PageTitle
				title="Toggle Components"
				description="Collection of toggle components for theme and font customization in Teams applications."
			/>

			<div className="grid grid-cols-1  gap-8 p-4">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<ComponentExample
						title="Theme Toggle"
						code={`import { ThemeToggle } from '@ever-teams/atoms';

<ThemeToggle />`}
					>
						<ThemeToggle />
					</ComponentExample>
					<ComponentExample
						title="Teams Theme Toggle"
						code={`import { TeamsThemeToggle } from '@ever-teams/atoms';

<TeamsThemeToggle />`}
					>
						<TeamsThemeToggle />
					</ComponentExample>

					<ComponentExample
						title="Font Toggle"
						code={`import { TeamsFontToggle } from '@ever-teams/atoms';

<TeamsFontToggle />`}
					>
						<TeamsFontToggle  />
					</ComponentExample>
				</div>
			</div>
		</div>
	);
}
