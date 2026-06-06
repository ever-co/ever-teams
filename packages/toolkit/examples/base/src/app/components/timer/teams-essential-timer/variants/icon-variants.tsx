'use client';

import { TeamsEssentialTimer } from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function IconVariants() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
			<ComponentExample
				title="Default with Icon"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer icon readonly />`}
			>
				<TeamsEssentialTimer icon readonly />
			</ComponentExample>

			<ComponentExample
				title="Border with Icon"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer border="thick" icon readonly />`}
			>
				<TeamsEssentialTimer border="thick" icon readonly />
			</ComponentExample>

			<ComponentExample
				title="Border Rounded with Icon"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer border="thick" icon readonly rounded="large" />`}
			>
				<TeamsEssentialTimer border="thick" icon readonly rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Gray with Icon"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="secondary" icon readonly />`}
			>
				<TeamsEssentialTimer background="secondary" icon readonly />
			</ComponentExample>

			<ComponentExample
				title="Gray Rounded with Icon"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="secondary" icon readonly rounded="small" />`}
			>
				<TeamsEssentialTimer background="secondary" icon readonly rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Gray Full Rounded with Icon"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="secondary" icon readonly rounded="large" />`}
			>
				<TeamsEssentialTimer background="secondary" icon readonly rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Contained with Icon"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="primary" color="destructive" icon readonly />`}
			>
				<TeamsEssentialTimer background="primary" color="destructive" icon readonly />
			</ComponentExample>

			<ComponentExample
				title="Contained Rounded with Icon"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="primary" color="destructive" icon readonly rounded="small" />`}
			>
				<TeamsEssentialTimer background="primary" color="destructive" icon readonly rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Contained Full Rounded with Icon"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="primary" color="destructive" icon readonly rounded="large" />`}
			>
				<TeamsEssentialTimer background="primary" color="destructive" icon readonly rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Border Full Rounded with Icon"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer border="thick" icon readonly rounded="small" />`}
			>
				<TeamsEssentialTimer border="thick" icon readonly rounded="small" />
			</ComponentExample>
		</div>
	);
}
