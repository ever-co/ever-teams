import React from 'react';
import { TeamsMember } from '@ever-teams/atoms';

interface IMemberTeamsProps {
	size?: 'default' | 'sm' | 'lg';
	showProgress?: boolean;
	showTime?: boolean;
	className?: string;
}
export const BasicMember = ({ ...props }: IMemberTeamsProps) => {
	return <TeamsMember seconds={0} {...props} />;
};
