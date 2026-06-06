'use client';

import { TeamsExtraTimer } from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function ButtonVariants() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
			<ComponentExample
				title="Default with Button"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer icon labeled progress />`}
			>
				<TeamsExtraTimer icon labeled progress />
			</ComponentExample>

			<ComponentExample
				title="Border with Button"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer border="thick" icon labeled progress />`}
			>
				<TeamsExtraTimer border="thick" icon labeled progress />
			</ComponentExample>

			<ComponentExample
				title="Border Rounded with Button"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer border="thick" icon labeled progress rounded="small" />`}
			>
				<TeamsExtraTimer border="thick" icon labeled progress rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Border Full Rounded with Button"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer border="thick" icon labeled progress rounded="large" />`}
			>
				<TeamsExtraTimer border="thick" icon labeled progress rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Gray with Button"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="secondary" icon labeled progress />`}
			>
				<TeamsExtraTimer background="secondary" icon labeled progress />
			</ComponentExample>

			<ComponentExample
				title="Gray Rounded with Button"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="secondary" icon labeled progress rounded="small" />`}
			>
				<TeamsExtraTimer background="secondary" icon labeled progress rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Gray Full Rounded with Button"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="secondary" icon labeled progress rounded="large" />`}
			>
				<TeamsExtraTimer background="secondary" icon labeled progress rounded="large" />
			</ComponentExample>

			<ComponentExample
				title="Contained with Button"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="primary" color="destructive" icon labeled progress />`}
			>
				<TeamsExtraTimer background="primary" color="destructive" icon labeled progress />
			</ComponentExample>

			<ComponentExample
				title="Contained Rounded with Button"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="primary" color="destructive" icon labeled progress rounded="small" />`}
			>
				<TeamsExtraTimer background="primary" color="destructive" icon labeled progress rounded="small" />
			</ComponentExample>

			<ComponentExample
				title="Contained Full Rounded with Button"
				code={`import { TeamsExtraTimer } from '@ever-teams/atoms';

<TeamsExtraTimer background="primary" color="destructive" icon labeled progress rounded="large" />`}
			>
				<TeamsExtraTimer background="primary" color="destructive" icon labeled progress rounded="large" />
			</ComponentExample>
		</div>
	);
}
