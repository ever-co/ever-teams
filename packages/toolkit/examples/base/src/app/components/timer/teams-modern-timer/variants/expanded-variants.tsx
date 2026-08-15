'use client';

import { TeamsModernTimer } from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function ExpandedVariants() {
	return (
		<div className="grid grid-cols-1 gap-8 p-4">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<ComponentExample
					title="Default Expandable"
					code={`import { TeamsModernTimer } from '@ever-teams/atoms';

<TeamsModernTimer
  variant="default"
  expandable={true}
  showProgress={false}
/>`}
				>
					<TeamsModernTimer variant="default" expandable={true} showProgress={false} />
				</ComponentExample>

				<ComponentExample
					title="Border Expandable"
					code={`import { TeamsModernTimer } from '@ever-teams/atoms';

<TeamsModernTimer
  variant="bordered"
  expandable={true}
  showProgress={false}
/>`}
				>
					<TeamsModernTimer variant="bordered" expandable={true} showProgress={false} />
				</ComponentExample>

				<ComponentExample
					title="Small Expandable"
					code={`import { TeamsModernTimer } from '@ever-teams/atoms';

<TeamsModernTimer
  variant="default"
  size="sm"
  expandable={true}
  showProgress={false}
/>`}
				>
					<TeamsModernTimer variant="default" size="sm" expandable={true} showProgress={false} />
				</ComponentExample>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<ComponentExample
					title="Large Expandable"
					code={`import { TeamsModernTimer } from '@ever-teams/atoms';

<TeamsModernTimer
  variant="default"
  size="lg"
  expandable={true}
  showProgress={false}
/>`}
				>
					<TeamsModernTimer variant="default" size="lg" expandable={true} showProgress={false} />
				</ComponentExample>
			</div>
		</div>
	);
}
