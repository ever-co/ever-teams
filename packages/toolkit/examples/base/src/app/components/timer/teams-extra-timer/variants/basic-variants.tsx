'use client';

import { TeamsExtraTimer } from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function BasicVariants() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
			<ComponentExample
				title="Default"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer progress={false} />`}
			>
				<TeamsExtraTimer progress={false} key="default" />
			</ComponentExample>

			<ComponentExample
				title="Border"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer border="thick" readonly />`}
			>
				<TeamsExtraTimer border="thick" readonly />
			</ComponentExample>

			<ComponentExample
				title="Border Rounded"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer border="thick" rounded="small" readonly />`}
			>
				<TeamsExtraTimer border="thick" rounded="small" readonly />
			</ComponentExample>

			<ComponentExample
				title="Border Full Rounded"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer border="thick" rounded="large" readonly />`}
			>
				<TeamsExtraTimer border="thick" rounded="large" readonly />
			</ComponentExample>

			<ComponentExample
				title="Gray"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="secondary" readonly />`}
			>
				<TeamsExtraTimer background="secondary" readonly />
			</ComponentExample>

			<ComponentExample
				title="Gray Rounded"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="secondary" rounded="small" readonly />`}
			>
				<TeamsExtraTimer background="secondary" rounded="small" readonly />
			</ComponentExample>

			<ComponentExample
				title="Gray Full Rounded"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="secondary" rounded="large" readonly />`}
			>
				<TeamsExtraTimer background="secondary" rounded="large" readonly />
			</ComponentExample>

			<ComponentExample
				title="Contained"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="primary" color="destructive" readonly />`}
			>
				<TeamsExtraTimer background="primary" color="destructive" readonly />
			</ComponentExample>

			<ComponentExample
				title="Contained Rounded"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="primary" color="destructive" rounded="small" readonly />`}
			>
				<TeamsExtraTimer background="primary" color="destructive" rounded="small" readonly />
			</ComponentExample>

			<ComponentExample
				title="Contained Full Rounded"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="primary" color="destructive" rounded="large" readonly />`}
			>
				<TeamsExtraTimer background="primary" color="destructive" rounded="large" readonly />
			</ComponentExample>
		</div>
	);
}
