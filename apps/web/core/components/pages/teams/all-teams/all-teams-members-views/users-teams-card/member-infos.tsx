import { cn } from '@/core/lib/helpers';
import { useMemberIdentity } from '@/core/hooks';
import { UserInfo } from '../../../team/team-members-views/user-team-card/user-info';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

export default function MemberInfo({ member, className }: { member: TOrganizationTeamEmployee; className?: string }) {
	const memberInfo = useMemberIdentity(member);
	return <UserInfo memberInfo={memberInfo} className={cn('w-full', className)} publicTeam={false} />;
}
