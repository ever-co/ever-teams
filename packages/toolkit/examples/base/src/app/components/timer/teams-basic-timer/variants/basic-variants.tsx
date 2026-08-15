'use client';

import { TeamsBasicTimer } from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function BasicVariants() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
			<ComponentExample
				title="Default"
				code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer />`}
			>
				<TeamsBasicTimer />
			</ComponentExample>

			<ComponentExample
				title="Border"
				code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer border="thick" readonly />`}
			>
				<TeamsBasicTimer border="thick" readonly />
			</ComponentExample>

			<ComponentExample
				title="Border Rounded"
				code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer border="thick" readonly rounded="small" />`}
			>
				<TeamsBasicTimer border="thick" readonly rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Border Full Rounded"
				code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer border="thick" readonly rounded="large" />`}
			>
				<TeamsBasicTimer border="thick" readonly rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Gray"
				code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="secondary" readonly />`}
			>
				<TeamsBasicTimer background="secondary" readonly />
			</ComponentExample>

			<ComponentExample
				title="Gray Rounded"
				code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="secondary" readonly rounded="small" />`}
			>
				<TeamsBasicTimer background="secondary" readonly rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Gray Full Rounded"
				code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="secondary" readonly rounded="large" />`}
			>
				<TeamsBasicTimer background="secondary" readonly rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Contained"
				code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer  background="primary" color="destructive" readonly />`}
			>
				<TeamsBasicTimer background="primary" color="destructive" readonly />
			</ComponentExample>

			<ComponentExample
				title="Contained Rounded"
				code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="primary" color="destructive" readonly  rounded="small" />`}
			>
				<TeamsBasicTimer background="primary" color="destructive" readonly rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Contained Full Rounded"
				code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="primary" color="destructive" readonly rounded="large" />`}
			>
				<TeamsBasicTimer background="primary" color="destructive" readonly rounded="large" />
			</ComponentExample>
		</div>
	);
}
