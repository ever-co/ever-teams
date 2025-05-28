import { useTeamMemberCard } from '@/core/hooks';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/organization-team-employee';
import { UserBoxInfo } from '../../../team/team-members-views/user-team-block/user-info';

export default function MemberBoxInfo({ member }: { member: IOrganizationTeamEmployee }) {
	const memberInfo = useTeamMemberCard(member);
	return <UserBoxInfo memberInfo={memberInfo} publicTeam={false} />;
}
