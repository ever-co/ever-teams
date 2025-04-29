import { useTeamMemberCard } from '@app/hooks';
import { OT_Member } from '@app/interfaces';
import { UserBoxInfo } from '@/core/components/features/team/user-team-block/user-info';

export default function MemberBoxInfo({ member }: { member: OT_Member }) {
	const memberInfo = useTeamMemberCard(member);
	return <UserBoxInfo memberInfo={memberInfo} publicTeam={false} />;
}
