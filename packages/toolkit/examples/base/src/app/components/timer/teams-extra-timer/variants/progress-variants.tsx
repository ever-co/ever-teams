'use client';

import { TeamsExtraTimer } from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function ProgressVariants() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
			<ComponentExample
				title="Default with Progress"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer icon progress readonly />`}
			>
				<TeamsExtraTimer icon progress readonly />
			</ComponentExample>

			<ComponentExample
				title="Border with Progress"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer border="thick" icon progress readonly />`}
			>
				<TeamsExtraTimer border="thick" icon progress readonly />
			</ComponentExample>

			<ComponentExample
				title="Border Rounded with Progress"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer border="thick" icon progress readonly rounded="small" />`}
			>
				<TeamsExtraTimer border="thick" icon progress readonly rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Border Full Rounded with Progress"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer border="thick" icon progress readonly rounded="large" />`}
			>
				<TeamsExtraTimer border="thick" icon progress readonly rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Gray with Progress"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="secondary" icon progress readonly />`}
			>
				<TeamsExtraTimer background="secondary" icon progress readonly />
			</ComponentExample>

			<ComponentExample
				title="Gray Rounded with Progress"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="secondary" icon progress readonly rounded="small" />`}
			>
				<TeamsExtraTimer background="secondary" icon progress readonly rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Gray Full Rounded with Progress"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="secondary" icon progress readonly rounded="large" />`}
			>
				<TeamsExtraTimer background="secondary" icon progress readonly rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Contained with Progress"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="primary" color="destructive" icon progress readonly />`}
			>
				<TeamsExtraTimer background="primary" color="destructive" icon progress readonly />
			</ComponentExample>

			<ComponentExample
				title="Contained Rounded with Progress"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="primary" color="destructive" icon progress readonly rounded="small" />`}
			>
				<TeamsExtraTimer background="primary" color="destructive" icon progress readonly rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Contained Full Rounded with Progress"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="primary" color="destructive" icon progress readonly rounded="large" />`}
			>
				<TeamsExtraTimer background="primary" color="destructive" icon progress readonly rounded="large" />
			</ComponentExample>
		</div>
	);
}
