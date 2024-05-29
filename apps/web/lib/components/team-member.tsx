import { UserInfo } from 'lib/features/team/user-team-card/user-info';
import { useTeamMemberCard } from '@app/hooks';
import { FaCheck } from "react-icons/fa6";
import { useEffect } from 'react';

export default function TeamMember(
	{ member, item, onCheckMember, membersList, validate }
		:
		{ member: any; item: any; onCheckMember: any; membersList: any; validate: any }
) {
	const memberInfo = useTeamMemberCard(member);
	const { assignTask } = useTeamMemberCard(member);
	const checkAssign = membersList.assignedMembers.some(el => el.id === member.employeeId);
	const checkUnassign = membersList.unassignedMembers.some(el => el.id === member.employeeId);

	useEffect(() => {
		if (validate) {
			if (checkAssign) {
				assignTask(item);
			} else if (checkUnassign) {
				memberInfo.unassignTask(item);
			}
		}
	}, [validate, checkAssign, checkUnassign, item, assignTask, memberInfo]);

	const assignMember = () => {
		onCheckMember(member.employee);
	}

	return (
		<div
			onClick={() => { assignMember() }}
			className="w-100 cursor-pointer flex items-center"
		>
			<UserInfo memberInfo={memberInfo} className="2xl:w-[20.625rem] w-100 pointer-events-none" />
			{checkAssign ? (<FaCheck size={17} fill="#3826a6" />) : (<></>)}
		</div>
	);
}
