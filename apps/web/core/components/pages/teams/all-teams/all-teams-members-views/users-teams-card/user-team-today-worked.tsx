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
		<div
			className={cn(
				'flex gap-4 justify-center items-center w-1/5 cursor-pointer lg:px-3 2xl:w-52 max-w-[13rem]',
				className
			)}
		>
			<TodayWorkedTime isAuthUser={memberInfo.isAuthUser} className="" memberInfo={memberInfo} />
		</div>
	);
}
