import { imgTitle } from '@/core/lib/helpers/index';
import { useTeamTasks } from '@/core/hooks';
import { clsxm, isValidUrl } from '@/core/lib/utils';
import clsx from 'clsx';
import { ConfirmDropdown, SpinnerLoader } from '@/core/components';
import ImageComponent, { ImageOverlapperProps } from '@/core/components/common/image-overlapper';
import { CrossIcon, RefreshIcon } from 'assets/svg';
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
import { IEmployee } from '@/core/types/interfaces/organization/employee';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TEmployee } from '@/core/types/schemas';

type Props = {
	task?: TTask;
	onClick?: (task: TTask) => void;
	selected?: boolean;
} & IClassName;

export function TaskItem({ task, selected, onClick, className }: Props) {
	const { handleStatusUpdate, updateLoading } = useTeamTasks();
	const t = useTranslations();

	const handleChange = useCallback(
		(status: ETaskStatusName) => {
			handleStatusUpdate(status, 'status', task?.taskStatusId, task);
		},
		[task, handleStatusUpdate]
	);

	return (
		<div
			className={clsxm('flex justify-between items-center', className)}
			onClick={() => onClick && task && task.status !== 'closed' && onClick(task)}
		>
			<div
				className={clsxm(
					'font-normal min-w-[19rem] text-sm',
					'overflow-hidden text-ellipsis flex-1',
					selected && ['font-medium text-primary dark:text-primary-light']
				)}
			>
				<div className="inline-flex items-center mr-2">
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
						<TaskPriorityStatus showIssueLabels={false} className="px-1 py-1" task={task} />
					</div>
				</div>
				{task?.title}
			</div>

			<div className="flex gap-2 items-center pr-5 pl-2">
				<div onClick={(e) => e.stopPropagation()}>
					{/* <TaskStatusDropdown
						defaultValue={task?.status}
						onValueChange={handleChange}
						className="w-full"
					/> */}

					<TaskStatusModal
						types={'status'}
						title={t('common.SELECT_STATUS')}
						defaultValue={task?.status}
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
								{updateLoading ? <SpinnerLoader size={20} /> : <CrossIcon className="z-10 w-5 h-5" />}
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
									<button onClick={() => handleChange(ETaskStatusName.TODO)}>
										<RefreshIcon className="w-6 text-[#7E7991]" />
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

type PartialITeamTask = Partial<TTask> & { members?: TEmployee[] | null };

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
								'text-xs rounded-full text-default dark:text-white',
								'font-normal shadow-md text-md'
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
				<Avatar shape="circle" className="flex justify-center items-center border" size={25}>
					<span className="text-xs">+{members.length - limit}</span>
				</Avatar>
			)}
		</div>
	);
}
