import { useTeamMemberCard } from '@/core/hooks';
import { useCallback } from 'react';
import { IconsCheck } from '@/core/components/icons';
import { UserInfo } from '../pages/teams/team/team-members-views/user-team-card/user-info';
import { TEmployee, TOrganizationTeamEmployee } from '@/core/types/schemas';

export default function TeamMember({
	member,
	onClick,
	assigned
}: {
	member: TOrganizationTeamEmployee;
	onClick: (member: TEmployee) => void;
	assigned: boolean;
}) {
	const memberInfo = useTeamMemberCard(member);

	const toggleMember = useCallback(() => {
		onClick(member.employee);
	}, [onClick, member]);

	return (
		<div
			onClick={() => {
				toggleMember();
			}}
			className="w-100 cursor-pointer flex items-center"
		>
			<UserInfo memberInfo={memberInfo} className="2xl:w-[20.625rem] w-100 pointer-events-none" />
			{assigned ? <IconsCheck fill="#3826a6" /> : <></>}
		</div>
	);
}
