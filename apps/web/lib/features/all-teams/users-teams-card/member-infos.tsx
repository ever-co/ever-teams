import { useTeamMemberCard } from '@app/hooks';
import { OT_Member } from '@app/interfaces';
import { UserInfo } from 'lib/features/team/user-team-card/user-info';

export default function MemberInfo({ member }: { member: OT_Member }) {
	const memberInfo = useTeamMemberCard(member);
	return <UserInfo memberInfo={memberInfo} className="2xl:w-[20.625rem] w-1/4" publicTeam={false} />;
}
