'use client';

import { TeamsEssentialTimer } from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function ProgressVariants() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
			<ComponentExample
				title="Default with Progress"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer icon progress readonly />`}
			>
				<TeamsEssentialTimer icon progress readonly />
			</ComponentExample>

			<ComponentExample
				title="Border with Progress"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer border="thick" icon progress readonly />`}
			>
				<TeamsEssentialTimer border="thick" icon progress readonly />
			</ComponentExample>

			<ComponentExample
				title="Border Rounded with Progress"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer border="thick" icon progress readonly rounded="small" />`}
			>
				<TeamsEssentialTimer border="thick" icon progress readonly rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Border Full Rounded with Progress"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer border="thick" icon progress readonly rounded="large" />`}
			>
				<TeamsEssentialTimer border="thick" icon progress readonly rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Gray with Progress"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="secondary" icon progress readonly />`}
			>
				<TeamsEssentialTimer background="secondary" icon progress readonly />
			</ComponentExample>

			<ComponentExample
				title="Gray Rounded with Progress"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="secondary" icon progress readonly rounded="small" />`}
			>
				<TeamsEssentialTimer background="secondary" icon progress readonly rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Gray Full Rounded with Progress"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="secondary" icon progress readonly rounded="large" />`}
			>
				<TeamsEssentialTimer background="secondary" icon progress readonly rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Contained with Progress"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="primary" color="destructive" icon progress readonly />`}
			>
				<TeamsEssentialTimer background="primary" color="destructive" icon progress readonly />
			</ComponentExample>

			<ComponentExample
				title="Contained Rounded with Progress"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="primary" color="destructive" icon progress readonly rounded="small" />`}
			>
				<TeamsEssentialTimer background="primary" color="destructive" icon progress readonly rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Contained Full Rounded with Progress"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="primary" color="destructive" icon progress readonly rounded="large" />`}
			>
				<TeamsEssentialTimer background="primary" color="destructive" icon progress readonly rounded="large" />
			</ComponentExample>
		</div>
	);
}
