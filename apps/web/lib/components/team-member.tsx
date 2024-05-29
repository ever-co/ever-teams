import { UserInfo } from 'lib/features/team/user-team-card/user-info';
import { useTeamMemberCard } from '@app/hooks';
import { FaCheck } from "react-icons/fa6";

export default function TeamMember(
	{ member, item, onCheckMember, membersList }
		:c
		{ member: any; item: any; onCheckMember: any; membersList: any }
) {
	const memberInfo = useTeamMemberCard(member);
	// const { assignTask } = useTeamMemberCard(member);
	const checkAssign = membersList.assignedMembers.some(el => el.id === member.employeeId);

	const assignMember = () => {
		onCheckMember(member.employee);
	}

	return (
		<div
			onClick={() => {
				assignMember();
			}}

			className="w-100 cursor-pointer flex items-center"
		>
			<UserInfo memberInfo={memberInfo} className="2xl:w-[20.625rem] w-100 pointer-events-none" />
			{checkAssign ? (<FaCheck size={17} fill="#3826a6" />) : (<></>)}
		</div>
	);
}
