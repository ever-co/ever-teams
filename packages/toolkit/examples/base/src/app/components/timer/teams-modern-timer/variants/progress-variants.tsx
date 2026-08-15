'use client';

import { TeamsModernTimer } from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function ProgressVariants() {
	return (
		<div className="grid grid-cols-1 gap-8 p-4">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<ComponentExample
					title="Default with Progress"
					code={`import { TeamsModernTimer } from '@ever-teams/atoms';

<TeamsModernTimer
  variant="default"
  size="default"
  showProgress
  expandable={false}
/>`}
				>
					<TeamsModernTimer variant="default" size="default" showProgress expandable={false} />
				</ComponentExample>
				<ComponentExample
					title="Border with Progress"
					code={`import { TeamsModernTimer } from '@ever-teams/atoms';

<TeamsModernTimer
  variant="bordered"
  showProgress
  expandable={false}
/>`}
				>
					<TeamsModernTimer variant="bordered" showProgress expandable={false} />
				</ComponentExample>{' '}
				<ComponentExample
					title="Small with Progress"
					code={`import { TeamsModernTimer } from '@ever-teams/atoms';

<TeamsModernTimer
  variant="default"
  size="sm"
  showProgress
  expandable={false}
/>`}
				>
					<TeamsModernTimer variant="default" size="sm" showProgress expandable={false} />
				</ComponentExample>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<ComponentExample
					title="Large with Progress"
					code={`import { TeamsModernTimer } from '@ever-teams/atoms';

<TeamsModernTimer
  variant="default"
  size="lg"
  showProgress
  expandable={false}
/>`}
				>
					<TeamsModernTimer variant="default" size="lg" showProgress expandable={false} />
				</ComponentExample>
			</div>
		</div>
	);
}
