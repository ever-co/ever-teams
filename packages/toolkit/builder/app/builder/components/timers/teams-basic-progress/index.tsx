import { TeamsEssentialTimer, TeamsEssentialTimerProps } from '@ever-teams/atoms';
import { Input as Inputs } from '@builder.io/sdk';

export function TeamsEssentialTimerProgress({ progress, ...props }: Readonly<TeamsEssentialTimerProps>) {
	return <TeamsEssentialTimer {...props} />;
}

export const InputTeamsEssentialTimerProgress: Inputs[] = [
	{
		name: 'progress',
		type: 'boolean',
		defaultValue: false,
		friendlyName: 'Progress'
	},
	{
		name: 'icon',
		type: 'boolean',
		defaultValue: false
	},
	{
		name: 'labeled',
		type: 'boolean',
		friendlyName: 'Labeled',
		defaultValue: false
	},
	{
		name: 'format',
		type: 'enum',
		friendlyName: 'Time Format',
		defaultValue: 'default',
		enum: [
			{ label: 'Default', value: 'default', helperText: 'HH:MM:SS' },
			{ label: 'Compact', value: 'compact', helperText: 'H:M:S' },
			{ label: 'Hours & Minutes', value: 'hours_minutes', helperText: 'HH:MM' },
			{ label: 'Words', value: 'words', helperText: 'X hours Y minutes Z seconds' },
			{ label: 'Minimal', value: 'minimal', helperText: 'Xh Ym Zs' }
		]
	},
	{
		name: 'separator',
		type: 'enum',
		friendlyName: 'Separator Style',
		defaultValue: 'default',
		enum: [
			{ label: 'Default', value: 'default', helperText: 'Vertical line' },
			{ label: 'Colon', value: ':', helperText: ':' },
			{ label: 'Dot', value: '.', helperText: '.' },
			{ label: 'Space', value: ' ', helperText: 'Space' },
			{ label: 'Dash', value: '-', helperText: '-' }
		]
	},
	{
		name: 'background',
		type: 'enum',
		defaultValue: 'none',
		enum: [
			{ label: 'None', value: 'none', helperText: 'Background' },
			{ label: 'Primary', value: 'primary', helperText: 'Background' },
			{ label: 'Secondary', value: 'secondary', helperText: 'Background' },
			{ label: 'Destructive', value: 'destructive', helperText: 'Background' }
		]
	},
	{
		name: 'rounded',
		type: 'enum',
		friendlyName: 'Rounded',
		enum: [
			{ label: 'None', value: 'non', helperText: 'Rounded' },
			{ label: 'Small', value: 'small', helperText: 'Rounded' },
			{ label: 'Medium', value: 'medium', helperText: 'Rounded' },
			{ label: 'Large', value: 'large', helperText: 'Rounded' }
		]
	},
	{
		name: 'className',
		type: 'string',
		friendlyName: 'Class Name'
	}
];
