import { cn } from '@/core/lib/helpers';
import { useTeamMemberCard } from '@/core/hooks';
import { TodayWorkedTime } from '@/core/components/tasks/task-times';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/IOrganizationTeamEmployee';

export default function UserTeamActiveTaskTodayWorked({
	member,
	className
}: Readonly<{ member: IOrganizationTeamEmployee; className?: string }>) {
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
