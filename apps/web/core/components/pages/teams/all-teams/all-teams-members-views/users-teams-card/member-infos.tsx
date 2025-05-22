import { cn } from '@/core/lib/helpers';
import { useTeamMemberCard } from '@/core/hooks';
import { OT_Member } from '@/core/types/interfaces/to-review';
import { UserInfo } from '../../../team/team-members-views/user-team-card/user-info';

export default function MemberInfo({ member, className }: { member: OT_Member; className?: string }) {
	const memberInfo = useTeamMemberCard(member);
	return <UserInfo memberInfo={memberInfo} className={cn('2xl:w-[20.625rem] w-1/4', className)} publicTeam={false} />;
}
