import { useFavorites, useModal, useTeamTasks } from '@/core/hooks';
import { detailedTaskState } from '@/core/stores';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/core/components/common/hover-card';
import { Button, CopyTooltip } from '@/core/components';
import Image from 'next/image';
import { CheckSimpleIcon, CopyRoundIcon } from 'assets/svg';

import Link from 'next/link';
import { ChangeEvent, useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import CreateParentTask from '../parent-task';
import TitleLoader from './title-loader';
import { useTranslations } from 'next-intl';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { clsxm } from '@/core/lib/utils';
import { Heart } from 'lucide-react';
import { ActiveTaskIssuesDropdown } from '@/core/components/tasks/task-issue';
import { EIssueType } from '@/core/types/generics/enums/task';
import { favoritesState } from '@/core/stores/common/favorites';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { Spinner } from '@/core/components/common/spinner';
import { toast } from 'sonner';
import { TTask } from '@/core/types/schemas/task/task.schema';

const TaskTitleBlock = () => {
	const { updateTitle, updateLoading } = useTeamTasks();
	const t = useTranslations();
	const favorites = useAtomValue(favoritesState);
	const { toggleFavoriteTask, createFavoriteLoading, deleteFavoriteLoading } = useFavorites();

	//DOM elements
	const titleDOM = useRef<HTMLTextAreaElement>(null);
	const saveButton = useRef<HTMLButtonElement>(null);
	const cancelButton = useRef<HTMLButtonElement>(null);
	const editButton = useRef<HTMLButtonElement>(null);
	const titleContainerRef = useRef<HTMLDivElement>(null);

	//States
	const [edit, setEdit] = useState<boolean>(false);
	const [task] = useAtom(detailedTaskState);
	const [title, setTitle] = useState<string>('');

	const isFavoriteTask = useMemo(
		() =>
			task
				? favorites.some((el) => {
						return el.entity === EBaseEntityEnum.Task && el.entityId === task.id;
					})
				: false,
		[task]
	);
	//Hooks and functions
	useEffect(() => {
		if (!edit) {
			task && !updateLoading && setTitle(task?.title);
		}
	}, [task, edit, updateLoading]);

	useEffect(() => {
		autoTextAreaHeight();
	}, [title]);

	useEffect(() => {
		titleDOM?.current?.focus();
	}, [edit]);

	const saveTitle = useCallback(
		(newTitle: string) => {
			if (newTitle.length > 255) {
				toast.error(t('pages.taskDetails.TASK_TITLE_CHARACTER_LIMIT_ERROR_TITLE'), {
					description: t('pages.taskDetails.TASK_TITLE_CHARACTER_LIMIT_ERROR_DESCRIPTION')
				});
				return;
			}

			updateTitle(newTitle, task, true);
			setEdit(false);
		},
		[task, updateTitle, t]
	);

	const saveOnEnter = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'Enter' && edit) {
			saveTitle(title);
			setEdit(false);
		}
	};

	useEffect(() => {
		const handleOutsideClick = (event: MouseEvent) => {
			if (edit && titleContainerRef.current && !titleContainerRef.current.contains(event.target as Node)) {
				saveTitle(title);
			}
		};

		document.addEventListener('mousedown', handleOutsideClick);

		return () => {
			document.removeEventListener('mousedown', handleOutsideClick);
		};
	}, [edit, saveTitle, title]);

	const cancelEdit = () => {
		task && setTitle(task?.title);
		setEdit(false);
	};

	const autoTextAreaHeight = () => {
		titleDOM.current?.style.setProperty('height', 'auto');
		titleDOM.current?.style.setProperty('height', titleDOM.current.scrollHeight + 'px');
	};

	const handleTaskTitleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		setTitle(event.target.value);
	};

	return (
		<div className="flex flex-col gap-[1.1875rem]" ref={titleContainerRef}>
			{task ? (
				<div className="flex gap-1">
					<textarea
						className={clsxm(
							'w-full',
							edit && 'textAreaOutline',
							'bg-transparent p-1 resize-none text-black dark:text-white not-italic font-medium text-2xl',
							'items-start outline-1 rounded-[0.1875rem] border-2 border-transparent scrollbar-hide'
						)}
						onChange={handleTaskTitleChange}
						onKeyDown={saveOnEnter}
						value={title}
						disabled={!edit}
						ref={titleDOM}
					/>

					{edit ? (
						<div className="flex flex-col justify-start gap-1 transition-all">
							<button
								ref={saveButton}
								onClick={() => saveTitle(title)}
								className="border-2 dark:border-[#464242] rounded-md"
							>
								<CheckSimpleIcon className="w-full max-w-[26px]" strokeWidth="1.6" />
							</button>
							<button
								ref={cancelButton}
								onClick={cancelEdit}
								className="border-2 dark:border-[#464242] rounded-md"
							>
								<XMarkIcon className="text-[#7E7991]" />
							</button>
						</div>
					) : (
						<div className="flex flex-col items-center justify-start gap-2">
							<button ref={editButton} onClick={() => setEdit(true)}>
								<Image
									src="/assets/svg/edit-header-pencil.svg"
									alt="edit header"
									width={28}
									height={28}
									style={{ height: '28px' }}
									className="cursor-pointer"
								/>
							</button>

							<CopyTooltip text={title} defaultTooltipText="Copy Title">
								<button className="text-[#B1AEBC]">
									<Image
										src="/assets/svg/copy.svg"
										alt="edit header"
										width={17}
										height={17}
										style={{ height: '17px' }}
										className="mr-1 cursor-pointer"
									/>
								</button>
							</CopyTooltip>
						</div>
					)}
				</div>
			) : (
				<TitleLoader />
			)}

			<div className="flex flex-col items-start">
				<div className="flex flex-row items-center justify-start gap-3">
					<div className="flex flex-row gap-2">
						{/* Task number */}
						<div className="bg-gray-200 dark:bg-slate-600 rounded text-center flex justify-center items-center h-7 py-1 px-2.5">
							<span className="text-xs font-medium text-gray-700 dark:text-gray-200">
								#{task?.taskNumber}
							</span>
						</div>

						{/* Type of Issue */}
						<ActiveTaskIssuesDropdown
							key={task?.id}
							task={task}
							showIssueLabels={true}
							sidebarUI={true}
							forParentChildRelationship={true}
							taskStatusClassName="h-7 text-xs rounded-full border-none bg-red-100 text-red-700 dark:bg-dark--theme-light dark:text-red-400"
							className="h-7"
						/>
					</div>
					<div className="w-[1px] h-7 bg-gray-200 dark:bg-gray-600"></div>

					{task?.issueType !== EIssueType.EPIC && task && (
						<div className="flex items-center gap-3">
							{/* Current Issue Type is Task|Bug and Parent Issue is Not an Epic */}
							{(!task?.issueType ||
								task?.issueType === EIssueType.TASK ||
								task?.issueType === EIssueType.BUG) &&
								task?.rootEpic &&
								task?.parentId !== task?.rootEpic.id && (
									<ParentTaskBadge
										task={{
											...task,
											parentId: task?.rootEpic.id,
											parent: task?.rootEpic
										}}
									/>
								)}

							<ParentTaskBadge task={task} />
							<ParentTaskInput task={task} />
						</div>
					)}

					{/* Favorites */}
					{task && (
						<button
							className={clsxm(
								'flex justify-center items-center w-7 h-7 rounded-full transition-colors ml-1',
								isFavoriteTask
									? 'text-red-600 bg-red-50 hover:bg-red-100'
									: 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
							)}
							onClick={() => toggleFavoriteTask(task)}
						>
							{createFavoriteLoading || deleteFavoriteLoading ? (
								<Spinner />
							) : isFavoriteTask ? (
								<svg
									className="w-4 h-4"
									fill="currentColor"
									viewBox="0 0 24 24"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path d="M14 20.408c-.492.308-.903.546-1.192.709-.153.086-.308.17-.463.252h-.002a.75.75 0 01-.686 0 16.709 16.709 0 01-.465-.252 31.147 31.147 0 01-4.803-3.34C3.8 15.572 1 12.331 1 8.513 1 5.052 3.829 2.5 6.736 2.5 9.03 2.5 10.881 3.726 12 5.605 13.12 3.726 14.97 2.5 17.264 2.5 20.17 2.5 23 5.052 23 8.514c0 3.818-2.801 7.06-5.389 9.262A31.146 31.146 0 0114 20.408z" />
								</svg>
							) : (
								<Heart className="w-4 h-4" />
							)}
						</button>
					)}
				</div>

				<CopyTooltip text={task?.taskNumber || ''}>
					<button className="flex gap-1 items-center text-[#B1AEBC] text-[0.5rem] 3xl:text-xs 3xl:py-2">
						<CopyRoundIcon className="text-[#B1AEBC] w-2.5 h-2.5" />
						{t('pages.settingsTeam.COPY_NUMBER')}
					</button>
				</CopyTooltip>
			</div>
		</div>
	);
};

export default TaskTitleBlock;

const ParentTaskBadge = ({ task }: { task: TTask | null }) => {
	return task?.parentId && task?.parent ? (
		<HoverCard>
			<HoverCardTrigger asChild>
				<Link
					href={`/task/${task.parentId}`}
					target="_blank"
					className={clsxm(
						task.parent.issueType === EIssueType.EPIC && 'bg-[#8154BA]',
						task.parent.issueType === EIssueType.STORY && 'bg-[#54BA951A]',
						task.parent.issueType === EIssueType.BUG && 'bg-[#C24A4A1A]',
						(task.parent.issueType === EIssueType.TASK || !task.parent.issueType) && 'bg-[#5483ba]',
						'rounded-[0.1875rem] text-center !h-7 3xl:h-6 flex justify-center items-center py-[0.25rem] px-2.5'
					)}
				>
					<span
						className={clsxm(
							task.parent.issueType === EIssueType.EPIC && 'text-white',
							task.parent.issueType === EIssueType.STORY && 'text-[#27AE60]',
							task.parent.issueType === EIssueType.BUG && 'text-[#C24A4A]',
							(task.parent.issueType === EIssueType.TASK || !task.parent.issueType) && 'text-white',
							'font-medium text-[0.5rem] 3xl:text-xs max-w-[10rem] overflow-hidden text-ellipsis whitespace-nowrap'
						)}
					>
						<span
							className={clsxm(
								task.parent.issueType === EIssueType.EPIC && 'text-[#FFFFFF80]',
								task.parent.issueType === EIssueType.STORY && 'text-[#27AE6080]',
								task.parent.issueType === EIssueType.BUG && 'text-[#C24A4A80]',
								(task.parent.issueType === EIssueType.TASK || !task.parent.issueType) && 'text-white'
							)}
						>{`#${task.parent.taskNumber || task.parent.number}`}</span>
						{` - ${task.parent.title}`}
					</span>
				</Link>
			</HoverCardTrigger>
			<HoverCardContent className="w-80">
				<Link href={`/task/${task.parentId}`} target="_blank">
					<div className="flex justify-between space-x-4">
						<div className="space-y-1">
							<h4 className="text-xl font-semibold">{`#${
								task.parent.taskNumber || task.parent.number
							}`}</h4>
							<p className="text-sm">{task.parent.title}</p>
						</div>
					</div>
				</Link>
			</HoverCardContent>
		</HoverCard>
	) : (
		<></>
	);
};
const ParentTaskInput = ({ task }: { task: TTask | null }) => {
	const modal = useModal();
	const t = useTranslations();

	return task && task.issueType !== EIssueType.EPIC ? (
		<div className="box-border flex items-center justify-center text-center bg-transparent rounded cursor-pointer h-7">
			<Button
				variant="outline-danger"
				className="text-[#f07258] font-medium text-xs py-1 px-2.5 min-w-[4.75rem] outline-none h-7 rounded"
				onClick={modal.openModal}
			>
				{task.parentId ? t('common.CHANGE_PARENT') : `+ ${t('common.ADD_PARENT')}`}
			</Button>

			<CreateParentTask modal={modal} task={task} />
		</div>
	) : (
		<></>
	);
};
