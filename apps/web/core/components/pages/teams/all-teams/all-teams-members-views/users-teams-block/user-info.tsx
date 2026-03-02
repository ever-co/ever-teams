import { useMemberIdentity } from '@/core/hooks';
import { UserBoxInfo } from '../../../team/team-members-views/user-team-block/user-info';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

export default function MemberBoxInfo({ member }: { member: TOrganizationTeamEmployee }) {
	const memberInfo = useMemberIdentity(member);
	return <UserBoxInfo memberInfo={memberInfo} publicTeam={false} />;
}
