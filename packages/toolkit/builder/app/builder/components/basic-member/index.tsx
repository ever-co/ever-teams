import React from 'react';
import { TeamsMember } from '@ever-teams/atoms';
import { Input } from '@builder.io/sdk';

interface IMemberTeamsProps {
	size?: 'default' | 'sm' | 'lg';
	showProgress?: boolean;
	showTime?: boolean;
	className?: string;
}
export const BasicMember = ({ ...props }: IMemberTeamsProps) => {
	return <TeamsMember seconds={0} {...props} />;
};

export const InputMember: Input[] = [
	{
		name: 'size',
		type: 'enum',
		defaultValue: 'default',
		enum: [
			{ label: 'Default', value: 'default' },
			{ label: 'Small', value: 'sm' },
			{ label: 'Large', value: 'lg' }
		]
	}
];
