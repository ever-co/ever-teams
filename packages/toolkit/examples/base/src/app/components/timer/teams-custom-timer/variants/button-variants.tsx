'use client';

import { TeamsCustomTimer } from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function ButtonVariants() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
			<ComponentExample
				title="Default with Button"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer icon labeled progress />`}
			>
				<TeamsCustomTimer icon labeled progress />
			</ComponentExample>

			<ComponentExample
				title="Border with Button"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer border="thick" icon labeled progress />`}
			>
				<TeamsCustomTimer border="thick" icon labeled progress />
			</ComponentExample>

			<ComponentExample
				title="Border Rounded with Button"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer border="thick" icon labeled progress rounded="small" />`}
			>
				<TeamsCustomTimer border="thick" icon labeled progress rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Border Full Rounded with Button"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer border="thick" icon labeled progress rounded="large" />`}
			>
				<TeamsCustomTimer border="thick" icon labeled progress rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Gray with Button"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="secondary" icon labeled progress />`}
			>
				<TeamsCustomTimer background="secondary" icon labeled progress />
			</ComponentExample>

			<ComponentExample
				title="Gray Rounded with Button"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="secondary" icon labeled progress rounded="small" />`}
			>
				<TeamsCustomTimer background="secondary" icon labeled progress rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Gray Full Rounded with Button"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="secondary" icon labeled progress rounded="large" />`}
			>
				<TeamsCustomTimer background="secondary" icon labeled progress rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Contained with Button"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="primary" color="destructive" icon labeled progress />`}
			>
				<TeamsCustomTimer background="primary" color="destructive" icon labeled progress />
			</ComponentExample>

			<ComponentExample
				title="Contained Rounded with Button"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="primary" color="destructive" icon labeled progress rounded="small" />`}
			>
				<TeamsCustomTimer background="primary" color="destructive" icon labeled progress rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Contained Full Rounded with Button"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="primary" color="destructive" icon labeled progress rounded="large" />`}
			>
				<TeamsCustomTimer background="primary" color="destructive" icon labeled progress rounded="large" />
			</ComponentExample>
		</div>
	);
}
