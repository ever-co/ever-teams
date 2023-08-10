import { imgTitle } from '@app/helpers';
import { useTeamTasks } from '@app/hooks';
import { IClassName, ITaskStatus, ITeamTask } from '@app/interfaces';
import { clsxm, isValidUrl } from '@app/utils';
import clsx from 'clsx';
import { Avatar, ConfirmDropdown, SpinnerLoader } from 'lib/components';
import { CloseIcon, RefreshIcon } from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import Link from 'next/link';
import { useCallback } from 'react';
import stc from 'string-to-color';
import { TaskIssueStatus } from './task-issue';
import { TaskPriorityStatus } from './task-status';
import { TaskStatusModal } from './task-status-modal';

type Props = {
	task?: ITeamTask;
	onClick?: (task: ITeamTask) => void;
	selected?: boolean;
} & IClassName;

export function TaskItem({ task, selected, onClick, className }: Props) {
	const { handleStatusUpdate, updateLoading } = useTeamTasks();
	const { trans } = useTranslation();

	const handleChange = useCallback(
		(status: ITaskStatus) => {
			handleStatusUpdate(status, 'status', task);
		},
		[task, handleStatusUpdate]
	);

	return (
		<div
			className={clsxm('flex justify-between items-center', className)}
			onClick={() =>
				onClick && task && task.status !== 'closed' && onClick(task)
			}
		>
			<div
				className={clsxm(
					'font-normal text-sm',
					'overflow-hidden text-ellipsis flex-1',
					selected && ['font-medium text-primary dark:text-primary-light']
				)}
			>
				<div className="inline-flex mr-2 items-center">
					<div className="mr-2">
						<TaskIssueStatus
							showIssueLabels={false}
							className={clsxm(
								' rounded-sm h-auto',
								task?.issueType === 'Bug'
									? '!px-[0.3312rem] py-[0.2875rem]'
									: '!px-[0.375rem] py-[0.375rem]',
								className
							)}
							task={task}
						/>
					</div>
					<div className="mr-2">
						<span className="opacity-50">#{task?.taskNumber}</span>
					</div>

					<div>
						<TaskPriorityStatus
							showIssueLabels={false}
							className="px-1 py-1"
							task={task}
						/>
					</div>
				</div>
				{task?.title}
			</div>

			<div className="flex items-center space-x-3 pl-2">
				<div onClick={(e) => e.stopPropagation()}>
					{/* <TaskStatusDropdown
						defaultValue={task?.status}
						onValueChange={handleChange}
						className="w-full"
					/> */}

					<TaskStatusModal
						types={'status'}
						title={trans.common.SELECT_STATUS}
						defaultValue={task?.status}
						onValueChange={handleChange}
					/>
				</div>
				{task && <TaskAvatars task={task} />}

				<div onClick={(e) => e.stopPropagation()}>
					{task?.status !== 'closed' && (
						<ConfirmDropdown
							onConfirm={() => handleChange('closed')}
							confirmText={'Confirm'}
						>
							{updateLoading ? <SpinnerLoader size={20} /> : <CloseIcon />}
						</ConfirmDropdown>
					)}

					{task?.status === 'closed' && (
						<>
							{updateLoading ? (
								<SpinnerLoader size={20} />
							) : (
								<button onClick={() => handleChange('todo')}>
									<RefreshIcon />
								</button>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

export function TaskAvatars({
	task,
	limit = 2,
}: {
	task: ITeamTask;
	limit?: number;
}) {
	const members = task.members;

	return (
		<div
			className="avatars flex -space-x-2 min-w-[59px] justify-center"
			onClick={(e) => e.stopPropagation()}
		>
			{members.slice(0, limit).map((member, i) => {
				const user = member.user;
				const userName = `${user?.firstName || ''} ${user?.lastName || ''}`;
				const userImageUrl =
					user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl || '';
				const size = 30;

				return (
					<Link key={i} title={userName} href={`/profile/${member.userId}`}>
						<div
							className={clsx(
								`w-[${size}px] h-[${size}px]`,
								'flex justify-center items-center',
								'rounded-full text-xs text-default dark:text-white',
								'shadow-md text-md font-normal'
							)}
							style={{
								backgroundColor: `${stc(userName)}80`,
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
					className="border flex items-center justify-center"
					size={25}
				>
					<span className="text-xs">+{members.length - limit}</span>
				</Avatar>
			)}
		</div>
	);
}
