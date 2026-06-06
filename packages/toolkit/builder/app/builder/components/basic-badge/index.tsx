import { Input as Inputs } from '@builder.io/sdk';
import { TeamsBadge } from '@ever-teams/atoms';
import { BadgeProps } from '@ever-teams/toolkit-ui';

export function BasicBadge({ ...props }: BadgeProps) {
	return <TeamsBadge {...props} />;
}

export const InputBadge: Inputs[] = [
	{
		name: 'title',
		type: 'string',
		defaultValue: 'Badge'
	},
	{
		name: 'className',
		type: 'string'
	},
	{
		name: 'variant',
		type: 'enum',
		defaultValue: 'default',
		enum: [
			{ label: 'Default', value: 'default' },
			{ label: 'Secondary', value: 'secondary' },
			{ label: 'Destructive', value: 'destructive' },
			{ label: 'Outline', value: 'outline' }
		]
	}
];
