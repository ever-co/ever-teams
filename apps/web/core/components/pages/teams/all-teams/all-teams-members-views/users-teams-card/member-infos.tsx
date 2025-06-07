import { cn } from '@/core/lib/helpers';
import { useTeamMemberCard } from '@/core/hooks';
import { UserInfo } from '../../../team/team-members-views/user-team-card/user-info';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

export default function MemberInfo({ member, className }: { member: TOrganizationTeamEmployee; className?: string }) {
	const memberInfo = useTeamMemberCard(member);
	return <UserInfo memberInfo={memberInfo} className={cn('2xl:w-[20.625rem] w-1/4', className)} publicTeam={false} />;
}
