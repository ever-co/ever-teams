import { imgTitle } from '@/core/lib/helpers/index';
import { useUpdateTask } from '@/core/hooks';
import { clsxm, isValidUrl } from '@/core/lib/utils';
import clsx from 'clsx';
import { ConfirmDropdown, SpinnerLoader } from '@/core/components';
import ImageComponent, { ImageOverlapperProps } from '@/core/components/common/image-overlapper';
import { RotateLeft, X } from '@/core/components/icons';
import Link from 'next/link';
import { useCallback } from 'react';
import stc from 'string-to-color';
import { TaskIssueStatus } from './task-issue';
import { TaskPriorityStatus } from './task-status';
import { TaskStatusModal } from './task-status-modal';
import { useTranslations } from 'next-intl';
import { Tooltip } from '../duplicated-components/tooltip';
import { Avatar } from '../duplicated-components/avatar';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { TTask } from '@/core/types/schemas/task/task.schema';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { findStatusByName } from '@/core/lib/utils/project-list';

type Props = {
	task?: TTask;
	onClick?: (task: TTask) => void;
	selected?: boolean;
} & IClassName;

/** A row action of the task picker: a quiet 24px icon button, like the other menus' row actions. */
const ROW_ICON_ACTION =
	'flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground';

/** The status row the picked name belongs to, so the task's status and its status id stay the same status. */
function statusIdOf(statuses: TTaskStatus[], statusName: string, task: TTask | undefined) {
	const status = findStatusByName(statuses, statusName);
	return status?.id ?? task?.taskStatusId;
}

export function TaskItem({ task, selected, onClick, className }: Props) {
	const { handleStatusUpdate, updateLoading } = useUpdateTask();
	const { taskStatuses } = useTaskStatusesQuery();
	const t = useTranslations();

	const handleChange = useCallback(
		(status: string) => {
			const statusId = statusIdOf(taskStatuses, status, task);
			handleStatusUpdate(status, 'status', statusId, task);
		},
		[task, taskStatuses, handleStatusUpdate]
	);

	return (
		<div
			className={clsxm('flex justify-between items-center', className)}
			onClick={() => onClick && task && task.status !== 'closed' && onClick(task)}
		>
			<div
				className={clsxm(
					'font-normal min-w-[19rem] text-sm text-foreground',
					'overflow-hidden text-ellipsis flex-1',
					selected && ['font-medium text-primary-ink']
				)}
			>
				<div className="inline-flex items-center mr-2">
					<div className="mr-2">
						<TaskIssueStatus showIssueLabels={false} className={clsxm('h-auto', className)} task={task} />
					</div>
					<div className="mr-2">
						<span className="text-muted-foreground tabular-nums">#{task?.taskNumber}</span>
					</div>

					<div>
						<TaskPriorityStatus showIssueLabels={false} className="p-1" task={task} />
					</div>
				</div>
				{task?.title}
			</div>

			<div className="flex gap-2 items-center pr-5 pl-2">
				<div onClick={(e) => e.stopPropagation()}>
					<TaskStatusModal
						types="status"
						defaultValue={task?.status ?? undefined}
						onValueChange={handleChange}
					/>
				</div>
				{task && <TaskAvatars task={task} />}

				<div onClick={(e) => e.stopPropagation()}>
					{task?.status !== 'closed' && (
						<Tooltip label={`${t('common.CLOSE')} ${t('common.TASK')}`} enabled placement="left">
							<ConfirmDropdown
								onConfirm={() => handleChange(ETaskStatusName.CLOSED)}
								confirmText={'Confirm'}
								className="fixed z-50"
							>
								{updateLoading && <SpinnerLoader size={16} />}
								{!updateLoading && (
									<span className={ROW_ICON_ACTION}>
										<X className="size-3.5" />
									</span>
								)}
							</ConfirmDropdown>
						</Tooltip>
					)}

					{task?.status === 'closed' && (
						<>
							{updateLoading ? (
								<SpinnerLoader size={20} />
							) : (
								<Tooltip
									label={`${t('common.REOPEN')} ${t('common.TASK')}`}
									enabled
									placement="left"
									className="min-w-10"
								>
									<button
										onClick={() => handleChange(ETaskStatusName.TODO)}
										className={ROW_ICON_ACTION}
									>
										<RotateLeft className="size-3.5" />
									</button>
								</Tooltip>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

type PartialITeamTask = Partial<TTask>;

export function TaskAvatars({ task, limit = 2 }: { task: PartialITeamTask; limit?: number }) {
	const members = task?.members || [];
	const taskAssignee: ImageOverlapperProps[] =
		members?.map((member: any) => {
			return {
				id: member.user?.id,
				url: member.user?.imageUrl,
				alt: member.user?.firstName
			};
		}) || [];

	if (!members?.length) {
		return (
			<div className="flex justify-center items-center -space-x-2 avatars min-w-10">
				<ImageComponent radius={30} diameter={30} images={taskAssignee} item={task} />
			</div>
		);
	}

	return (
		<div
			className="flex justify-center items-center -space-x-2 avatars min-w-10"
			onClick={(e) => e.stopPropagation()}
		>
			{members?.slice(0, limit).map((member, i) => {
				const user = member.user;
				const userName = `${user?.firstName || ''} ${user?.lastName || ''}`;
				const userImageUrl = user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl || '';
				const size = 30;

				return (
					<Link key={i} title={userName} href={`/profile/${member.userId}?name=${userName}`}>
						<div
							className={clsx(
								`w-[${size}px] h-[${size}px]`,
								'flex justify-center items-center',
								'text-xs rounded-full text-foreground',
								'font-medium ring-2 ring-card'
							)}
							style={{
								backgroundColor: `${stc(userName)}80`
							}}
						>
							{userImageUrl && isValidUrl(userImageUrl) ? (
								<Avatar
									size={size}
									className="relative cursor-pointer"
									imageUrl={userImageUrl}
									alt={userName}
									imageTitle={userName.charAt(0)}
								/>
							) : (
								imgTitle(userName).charAt(0)
							)}
						</div>
					</Link>
				);
			})}

			{members.length > limit && (
				<Avatar
					shape="circle"
					className="flex items-center justify-center bg-foreground/5 ring-2 ring-card size-7!"
					size={30}
				>
					<span className="text-xs font-medium tabular-nums text-muted-foreground">
						+{members.length - limit}
					</span>
				</Avatar>
			)}
		</div>
	);
}
