'use client';

import { TeamsExtraTimer } from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function IconVariants() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
			<ComponentExample
				title="Default with Icon"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer icon readonly />`}
			>
				<TeamsExtraTimer icon readonly />
			</ComponentExample>

			<ComponentExample
				title="Border with Icon"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer border="thick" icon readonly />`}
			>
				<TeamsExtraTimer border="thick" icon readonly />
			</ComponentExample>

			<ComponentExample
				title="Border Rounded with Icon"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer border="thick" icon readonly rounded="large" />`}
			>
				<TeamsExtraTimer border="thick" icon readonly rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Gray with Icon"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="secondary" icon readonly />`}
			>
				<TeamsExtraTimer background="secondary" icon readonly />
			</ComponentExample>

			<ComponentExample
				title="Gray Rounded with Icon"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="secondary" icon readonly rounded="small" />`}
			>
				<TeamsExtraTimer background="secondary" icon readonly rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Gray Full Rounded with Icon"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="secondary" icon readonly rounded="large" />`}
			>
				<TeamsExtraTimer background="secondary" icon readonly rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Contained with Icon"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="primary" color="destructive" icon readonly />`}
			>
				<TeamsExtraTimer background="primary" color="destructive" icon readonly />
			</ComponentExample>

			<ComponentExample
				title="Contained Rounded with Icon"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="primary" color="destructive" icon readonly rounded="small" />`}
			>
				<TeamsExtraTimer background="primary" color="destructive" icon readonly rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Contained Full Rounded with Icon"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="primary" color="destructive" icon readonly rounded="large" />`}
			>
				<TeamsExtraTimer background="primary" color="destructive" icon readonly rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Border Full Rounded with Icon"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer border="thick" icon readonly rounded="small" />`}
			>
				<TeamsExtraTimer border="thick" icon readonly rounded="small" />
			</ComponentExample>
		</div>
	);
}
