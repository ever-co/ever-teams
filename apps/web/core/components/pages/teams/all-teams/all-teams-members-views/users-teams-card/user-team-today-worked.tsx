import { cn } from '@/core/lib/helpers';
import { useMemberIdentity } from '@/core/hooks';
import { TodayWorkedTime } from '@/core/components/tasks/task-times';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

export default function UserTeamActiveTaskTodayWorked({
	member,
	className
}: Readonly<{ member: TOrganizationTeamEmployee; className?: string }>) {
	const memberInfo = useMemberIdentity(member);
	return (
		<div className={cn('flex min-w-0 items-center justify-end', className)}>
			<TodayWorkedTime
				isAuthUser={memberInfo.isAuthUser}
				className="text-right text-sm font-medium tabular-nums"
				memberInfo={memberInfo}
			/>
		</div>
	);
}
