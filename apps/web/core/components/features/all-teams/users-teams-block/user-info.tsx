import { useTeamMemberCard } from '@/core/hooks';
import { OT_Member } from '@/core/types/interfaces';
import { UserBoxInfo } from '@/core/components/features/team/user-team-block/user-info';

export default function MemberBoxInfo({ member }: { member: OT_Member }) {
	const memberInfo = useTeamMemberCard(member);
	return <UserBoxInfo memberInfo={memberInfo} publicTeam={false} />;
}
