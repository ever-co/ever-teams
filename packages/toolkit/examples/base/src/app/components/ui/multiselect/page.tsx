'use client';

import {
	MultiSelect,
	MultiSelectContent,
	MultiSelectGroup,
	MultiSelectItem,
	MultiSelectTrigger,
	MultiSelectValue
} from '@ever-teams/toolkit-ui';
import { PageTitle } from '@/components/page-title';
import { ComponentExample } from '@/components/component-example';
import { useState } from 'react';

const sampleItems = [
	{ label: 'Kevin Peterson', progress: 30, color: '#34d399' },
	{ label: 'Josh Kenan', progress: 25, color: '#eab308' },
	{ label: 'Arick Bulienine', progress: 75, color: '#eab308' },
	{ label: 'Innocent Akim', progress: 100, color: '#10b981' }
];

export default function MultiSelectVariants() {
	const [values, setValues] = useState<string[]>([]);
	return (
		<div className="space-y-8">
			<PageTitle
				title="MultiSelect Components"
				description="Collection of multiselect components for user selection in Teams applications."
			/>

			<div className="grid grid-cols-1 gap-8 p-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<ComponentExample
						title="Basic MultiSelect"
						code={`import {
	MultiSelect,
	MultiSelectContent,
	MultiSelectGroup,
	MultiSelectItem,
	MultiSelectTrigger,
	MultiSelectValue
} from '@ever-teams/toolkit-ui';

const sampleItems = [
  { label: 'Kevin Peterson', progress: 30, color: '#34d399' },
  { label: 'Josh Kenan', progress: 25, color: '#eab308' },
  { label: 'Arick Bulienine', progress: 75, color: '#eab308' },
  { label: 'Innocent Akim', progress: 100, color: '#10b981' }
];

<MultiSelect values={values} onValuesChange={(s) => setValues(s)}>
	<MultiSelectTrigger>
		<MultiSelectValue placeholder="Select employee ..." />
	</MultiSelectTrigger>
	<MultiSelectContent search={false}>
		<MultiSelectGroup>
			{sampleItems.map((item) => (
				<MultiSelectItem key={item.label} value={item.label}>
					{item.label}
				</MultiSelectItem>
			))}
		</MultiSelectGroup>
	</MultiSelectContent>
</MultiSelect>`}
					>
						<MultiSelect values={values} onValuesChange={(s) => setValues(s)}>
							<MultiSelectTrigger>
								<MultiSelectValue placeholder="Select employee ..." />
							</MultiSelectTrigger>
							<MultiSelectContent search={false}>
								<MultiSelectGroup>
									{sampleItems.map((item) => (
										<MultiSelectItem key={item.label} value={item.label}>
											{item.label}
										</MultiSelectItem>
									))}
								</MultiSelectGroup>
							</MultiSelectContent>
						</MultiSelect>
					</ComponentExample>
				</div>
			</div>
		</div>
	);
}
