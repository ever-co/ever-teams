import { Button } from '@components/ui/button';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator
} from '@components/ui/dropdown-menu';
import { useAuthenticateUser, useOrganizationTeams, useTeamMemberCard, useTMCardTaskEdit } from '@app/hooks';
import { useTranslations } from 'next-intl';
import { useFavoritesTask } from '@/app/hooks/features/useFavoritesTask';
import { ITeamTask } from '@app/interfaces';
import { FC, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const DropdownMenuTask: FC<{ task: ITeamTask }> = ({ task }) => {
	const { activeTeam } = useOrganizationTeams();
	const router = useRouter();
	const { user } = useAuthenticateUser();
	const isAssigned = task?.members?.some((m) => m?.user?.id === user?.id);
	const member = activeTeam?.members?.find((m) => m?.employee?.user?.id === user?.id);
	const memberInfo = useTeamMemberCard(member);
	const taskEdition = useTMCardTaskEdit(task);

	const { toggleFavorite, isFavorite } = useFavoritesTask();
	const t = useTranslations();

	const handleAssignment = useCallback(() => {
		if (isAssigned) {
			memberInfo.unassignTask(task);
		} else {
			memberInfo.assignTask(task);
		}
	}, [isAssigned, memberInfo, task]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="h-8 w-8 p-0 dark:text-gray-200 text-[#292D32]">
					<span className="sr-only">Open menu</span>
					<svg
						className="w-6 h-6"
						width={24}
						height={25}
						viewBox="0 0 24 25"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M5 10.5C3.9 10.5 3 11.4 3 12.5C3 13.6 3.9 14.5 5 14.5C6.1 14.5 7 13.6 7 12.5C7 11.4 6.1 10.5 5 10.5Z"
							stroke="currentColor"
							strokeWidth="1.5"
						/>
						<path
							d="M19 10.5C17.9 10.5 17 11.4 17 12.5C17 13.6 17.9 14.5 19 14.5C20.1 14.5 21 13.6 21 12.5C21 11.4 20.1 10.5 19 10.5Z"
							stroke="currentColor"
							strokeWidth="1.5"
						/>
						<path
							d="M12 10.5C10.9 10.5 10 11.4 10 12.5C10 13.6 10.9 14.5 12 14.5C13.1 14.5 14 13.6 14 12.5C14 11.4 13.1 10.5 12 10.5Z"
							stroke="currentColor"
							strokeWidth="1.5"
						/>
					</svg>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					className=" cursor-pointer"
					onClick={() => taskEdition?.task?.id && navigator.clipboard.writeText(taskEdition.task.id)}
				>
					Copy Task ID
				</DropdownMenuItem>
				<DropdownMenuSeparator />

				<DropdownMenuItem className="relative cursor-pointer" onClick={() => router.push(`/task/${task.id}`)}>
					{t('common.TASK_DETAILS')}
				</DropdownMenuItem>

				<DropdownMenuItem className=" cursor-pointer" onClick={() => toggleFavorite(task)}>
					{isFavorite(task) ? t('common.REMOVE_FAVORITE_TASK') : t('common.ADD_FAVORITE_TASK')}
				</DropdownMenuItem>

				<DropdownMenuItem className=" cursor-pointer" onClick={handleAssignment}>
					{isAssigned ? t('common.UNASSIGN_TASK') : t('common.ASSIGN_TASK')}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default DropdownMenuTask;
