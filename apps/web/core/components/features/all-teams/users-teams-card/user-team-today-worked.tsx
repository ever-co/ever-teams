import { cn } from '@/core/lib/helpers';
import { useTeamMemberCard } from '@/core/hooks';
import { OT_Member } from '@/core/types/interfaces';
import { TodayWorkedTime } from '@/core/components/features/task/task-times';

export default function UserTeamActiveTaskTodayWorked({
	member,
	className
}: Readonly<{ member: OT_Member; className?: string }>) {
	const memberInfo = useTeamMemberCard(member);
	return (
		<div
			className={cn(
				'flex justify-center items-center cursor-pointer w-1/5 gap-4 lg:px-3 2xl:w-52 max-w-[13rem]',
				className
			)}
		>
			<TodayWorkedTime isAuthUser={memberInfo.isAuthUser} className="" memberInfo={memberInfo} />
		</div>
	);
}
