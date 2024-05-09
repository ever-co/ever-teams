import { UserInfo } from 'lib/features/team/user-team-card/user-info';
import { useTeamMemberCard } from '@app/hooks';
import { useModal } from '@app/hooks';

export default function TeamMember({ member, item }: { member: any; item: any }) {
	const memberInfo = useTeamMemberCard(member);
	const { assignTask } = useTeamMemberCard(member);
	const { closeModal } = useModal();

	return (
		<div
			onClick={() => {
				assignTask(item);
				closeModal();
			}}

            className="w-100 cursor-pointer"
		>
			<UserInfo memberInfo={memberInfo} className="2xl:w-[20.625rem] w-100 pointer-events-none" />
		</div>
	);
}
