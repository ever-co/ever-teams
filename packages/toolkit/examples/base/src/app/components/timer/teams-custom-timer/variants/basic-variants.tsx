'use client';

import { TeamsCustomTimer } from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function BasicVariants() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
			<ComponentExample
				title="Default"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer progress={false} />`}
			>
				<TeamsCustomTimer progress={false} key="default" />
			</ComponentExample>

			<ComponentExample
				title="Border"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer border="thick" readonly />`}
			>
				<TeamsCustomTimer border="thick" readonly />
			</ComponentExample>

			<ComponentExample
				title="Border Rounded"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer border="thick" rounded="small" readonly />`}
			>
				<TeamsCustomTimer border="thick" rounded="small" readonly />
			</ComponentExample>

			<ComponentExample
				title="Border Full Rounded"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer border="thick" rounded="large" readonly />`}
			>
				<TeamsCustomTimer border="thick" rounded="large" readonly />
			</ComponentExample>

			<ComponentExample
				title="Gray"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="secondary" readonly />`}
			>
				<TeamsCustomTimer background="secondary" readonly />
			</ComponentExample>

			<ComponentExample
				title="Gray Rounded"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="secondary" rounded="small" readonly />`}
			>
				<TeamsCustomTimer background="secondary" rounded="small" readonly />
			</ComponentExample>

			<ComponentExample
				title="Gray Full Rounded"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="secondary" rounded="large" readonly />`}
			>
				<TeamsCustomTimer background="secondary" rounded="large" readonly />
			</ComponentExample>

			<ComponentExample
				title="Contained"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="primary" color="destructive" readonly />`}
			>
				<TeamsCustomTimer background="primary" color="destructive" readonly />
			</ComponentExample>

			<ComponentExample
				title="Contained Rounded"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="primary" color="destructive" rounded="small" readonly />`}
			>
				<TeamsCustomTimer background="primary" color="destructive" rounded="small" readonly />
			</ComponentExample>

			<ComponentExample
				title="Contained Full Rounded"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="primary" color="destructive" rounded="large" readonly />`}
			>
				<TeamsCustomTimer background="primary" color="destructive" rounded="large" readonly />
			</ComponentExample>
		</div>
	);
}
