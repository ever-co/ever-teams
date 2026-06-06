'use client';

import { TeamsCustomTimer } from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function ProgressVariants() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
			<ComponentExample
				title="Default with Progress"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer icon progress readonly />`}
			>
				<TeamsCustomTimer icon progress readonly />
			</ComponentExample>

			<ComponentExample
				title="Border with Progress"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer border="thick" icon progress readonly />`}
			>
				<TeamsCustomTimer border="thick" icon progress readonly />
			</ComponentExample>

			<ComponentExample
				title="Border Rounded with Progress"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer border="thick" icon progress readonly rounded="small" />`}
			>
				<TeamsCustomTimer border="thick" icon progress readonly rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Border Full Rounded with Progress"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer border="thick" icon progress readonly rounded="large" />`}
			>
				<TeamsCustomTimer border="thick" icon progress readonly rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Gray with Progress"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="secondary" icon progress readonly />`}
			>
				<TeamsCustomTimer background="secondary" icon progress readonly />
			</ComponentExample>

			<ComponentExample
				title="Gray Rounded with Progress"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="secondary" icon progress readonly rounded="small" />`}
			>
				<TeamsCustomTimer background="secondary" icon progress readonly rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Gray Full Rounded with Progress"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="secondary" icon progress readonly rounded="large" />`}
			>
				<TeamsCustomTimer background="secondary" icon progress readonly rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Contained with Progress"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="primary" color="destructive" icon progress readonly />`}
			>
				<TeamsCustomTimer background="primary" color="destructive" icon progress readonly />
			</ComponentExample>

			<ComponentExample
				title="Contained Rounded with Progress"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="primary" color="destructive" icon progress readonly rounded="small" />`}
			>
				<TeamsCustomTimer background="primary" color="destructive" icon progress readonly rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Contained Full Rounded with Progress"
				code={`import { TeamsCustomTimer } from '@ever-teams/atoms';

<TeamsCustomTimer background="primary" color="destructive" icon progress readonly rounded="large" />`}
			>
				<TeamsCustomTimer background="primary" color="destructive" icon progress readonly rounded="large" />
			</ComponentExample>
		</div>
	);
}
