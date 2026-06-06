'use client';

import { BasicTeamsMember } from './basic-teams-member';
import { useMember } from '@hooks/useMember';
interface MemberTeamsProps {
	size?: 'default' | 'sm' | 'lg';
	showProgress?: boolean;
	showTime?: boolean;
	className?: string;
	seconds: number;
}
export function MemberTeams({ size, className, showProgress, showTime, seconds }: MemberTeamsProps) {
	const { data: members } = useMember();

	const dynamicValues = members?.items.map((member) => ({
		label: member.fullName ?? '',
		progress: calculatePercentage(seconds),
		color: '#eab308'
	}));

	return (
		<BasicTeamsMember
			className={className}
			showTime={showTime}
			showProgress={showProgress}
			values={dynamicValues}
			variant="bordered"
			size={size}
			classNameTitle="font-bold"
		/>
	);
}

function calculatePercentage(seconds: number) {
	const percentage = (seconds * 60) / 100;
	return Math.floor(percentage);
}
