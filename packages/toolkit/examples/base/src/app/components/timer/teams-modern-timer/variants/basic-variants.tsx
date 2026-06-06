'use client';

import { TeamsModernTimer, TeamsThemeToggle } from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function BasicVariants() {
	return (
		<div className="space-y-8">
			<div className="grid grid-cols-1 gap-8 p-4">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<ComponentExample
						title="Default"
						code={`import { TeamsModernTimer } from '@ever-teams/atoms';

<TeamsModernTimer
  variant="default"
  size="default"
  expandable={false}
  showProgress={false}
/>`}
					>
						<TeamsModernTimer variant="default" size="default" expandable={false} showProgress={false} />
					</ComponentExample>

					<ComponentExample
						title="Border"
						code={`import { TeamsModernTimer } from '@ever-teams/atoms';

<TeamsModernTimer
  variant="bordered"
  showProgress={false}
  expandable={false}
/>`}
					>
						<TeamsModernTimer variant="bordered" expandable={false} showProgress={false} />
					</ComponentExample>

					<ComponentExample
						title="Small"
						code={`import { TeamsModernTimer } from '@ever-teams/atoms';

<TeamsModernTimer
  variant="default"
  size="sm"
  showProgress={false}
  expandable={false}
/>`}
					>
						<TeamsModernTimer variant="default" size="sm" expandable={false} showProgress={false} />
					</ComponentExample>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<ComponentExample
						title="Large"
						code={`import { TeamsModernTimer } from '@ever-teams/atoms';

<TeamsModernTimer
  variant="default"
  size="lg"
  expandable={false}
  showProgress={false}
/>`}
					>
						<TeamsModernTimer variant="default" size="lg" expandable={false} showProgress={false} />
					</ComponentExample>
				</div>
			</div>
		</div>
	);
}
