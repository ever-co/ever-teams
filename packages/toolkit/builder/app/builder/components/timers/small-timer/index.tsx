import React from 'react';
import { TeamsBasicTimer, useAccessToken } from '@ever-teams/atoms';
import { Input as Inputs } from '@builder.io/sdk';

export function SmallTimer({
	border,
	background,
	color,
	rounded,
	className,
	...props
}: {
	border: 'none' | 'thick' | 'thin';
	background: 'destructive' | 'none' | 'primary' | 'secondary';
	color: 'destructive' | 'primary' | 'secondary';
	rounded: 'none' | 'small' | 'medium' | 'large';
	textAlign: string;
	className: string;
}) {
	const { accessToken } = useAccessToken();
	return (
		<div>
			<TeamsBasicTimer {...props} className={className} background={background} border={border} color={color} />
		</div>
	);
}

export const InputsSmallTimer: Inputs[] = [
	{
		type: 'enum',
		name: 'border',
		defaultValue: 'thick',
		friendlyName: 'Border',
		required: true,
		enum: [
			{
				label: 'None',
				value: 'none'
			},
			{
				label: 'Thick',
				value: 'thick'
			},
			{
				label: 'Thin',
				value: 'thin'
			}
		]
	},

	{
		type: 'enum',
		name: 'background',
		friendlyName: 'Background',
		defaultValue: 'primary',
		enum: [
			{
				label: 'Primary',
				value: 'primary'
			},
			{
				label: 'Secondary',
				value: 'secondary'
			},
			{
				label: 'Destructive',
				value: 'destructive'
			}
		]
	},
	{
		type: 'enum',
		name: 'color',
		friendlyName: 'Color',
		defaultValue: 'secondary',
		required: true,
		enum: [
			{
				label: 'Primary',
				value: 'primary'
			},
			{
				label: 'Secondary',
				value: 'secondary'
			},
			{
				label: 'Destructive',
				value: 'destructive'
			}
		]
	},
	{
		type: 'enum',
		name: 'rounded',
		defaultValue: 'large',
		friendlyName: 'Rounded',
		required: true,
		enum: [
			{
				label: 'None',
				value: 'none'
			},
			{
				label: 'Small',
				value: 'small'
			},
			{
				label: 'Medium',
				value: 'medium'
			},
			{
				label: 'Large',
				value: 'large'
			}
		]
	},
	{
		name: 'className',
		type: 'string'
	}
];
