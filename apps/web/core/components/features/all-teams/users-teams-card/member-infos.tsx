import { cn } from '@/lib/utils';
import { useTeamMemberCard } from '@/core/hooks';
import { OT_Member } from '@app/interfaces';
import { UserInfo } from '@/core/components/features/team/user-team-card/user-info';

export default function MemberInfo({ member, className }: { member: OT_Member; className?: string }) {
	const memberInfo = useTeamMemberCard(member);
	return <UserInfo memberInfo={memberInfo} className={cn('2xl:w-[20.625rem] w-1/4', className)} publicTeam={false} />;
}
