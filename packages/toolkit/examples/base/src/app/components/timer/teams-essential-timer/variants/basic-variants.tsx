'use client';

import { TeamsEssentialTimer } from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function BasicVariants() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
			<ComponentExample
				title="Default"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer progress={false} />`}
			>
				<TeamsEssentialTimer progress={false} key="default" />
			</ComponentExample>

			<ComponentExample
				title="Border"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer border="thick" readonly />`}
			>
				<TeamsEssentialTimer border="thick" readonly />
			</ComponentExample>

			<ComponentExample
				title="Border Rounded"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer border="thick" rounded="small" readonly />`}
			>
				<TeamsEssentialTimer border="thick" rounded="small" readonly />
			</ComponentExample>

			<ComponentExample
				title="Border Full Rounded"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer border="thick" rounded="large" readonly />`}
			>
				<TeamsEssentialTimer border="thick" rounded="large" readonly />
			</ComponentExample>

			<ComponentExample
				title="Gray"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="secondary" readonly />`}
			>
				<TeamsEssentialTimer background="secondary" readonly />
			</ComponentExample>

			<ComponentExample
				title="Gray Rounded"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="secondary" rounded="small" readonly />`}
			>
				<TeamsEssentialTimer background="secondary" rounded="small" readonly />
			</ComponentExample>

			<ComponentExample
				title="Gray Full Rounded"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="secondary" rounded="large" readonly />`}
			>
				<TeamsEssentialTimer background="secondary" rounded="large" readonly />
			</ComponentExample>

			<ComponentExample
				title="Contained"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="primary" color="destructive" readonly />`}
			>
				<TeamsEssentialTimer background="primary" color="destructive" readonly />
			</ComponentExample>

			<ComponentExample
				title="Contained Rounded"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="primary" color="destructive" rounded="small" readonly />`}
			>
				<TeamsEssentialTimer background="primary" color="destructive" rounded="small" readonly />
			</ComponentExample>

			<ComponentExample
				title="Contained Full Rounded"
				code={`import { TeamsEssentialTimer } from '@ever-teams/atoms';

<TeamsEssentialTimer background="primary" color="destructive" rounded="large" readonly />`}
			>
				<TeamsEssentialTimer background="primary" color="destructive" rounded="large" readonly />
			</ComponentExample>
		</div>
	);
}
