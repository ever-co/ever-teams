import { useTeamMemberCard } from '@/core/hooks';
import { IOrganizationTeamMember } from '@/core/types/interfaces/to-review';
import { UserBoxInfo } from '../../../team/team-members-views/user-team-block/user-info';

export default function MemberBoxInfo({ member }: { member: IOrganizationTeamMember }) {
	const memberInfo = useTeamMemberCard(member);
	return <UserBoxInfo memberInfo={memberInfo} publicTeam={false} />;
}
