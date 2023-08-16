import { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';
import Image from 'next/image';
import { detailedTaskState } from '@app/stores';
import { useRecoilState } from 'recoil';
import { useModal, useTeamTasks } from '@app/hooks';
import TitleLoader from './title-loader';
import { ActiveTaskIssuesDropdown } from 'lib/features';
import { Button, Tooltip } from 'lib/components';
import { useToast } from '@components/ui/use-toast';
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '@components/ui/hover-card';
import { useTranslation } from 'lib/i18n';
import CreateParentTask from '../ParentTask';
import Link from 'next/link';
import { ITeamTask } from '@app/interfaces';
import {
	CloseAlternateIcon,
	TickIcon,
	CopyIconRounded,
} from 'lib/components/svgs';

const TaskTitleBlock = () => {
	const { updateTitle, updateLoading } = useTeamTasks();
	const { toast } = useToast();
	const { trans } = useTranslation('taskDetails');

	//DOM elements
	const titleDOM = useRef<HTMLTextAreaElement>(null);
	const saveButton = useRef<HTMLButtonElement>(null);
	const cancelButton = useRef<HTMLButtonElement>(null);
	const editButton = useRef<HTMLButtonElement>(null);
	const titleContainerRef = useRef<HTMLDivElement>(null);

	//States
	const [edit, setEdit] = useState<boolean>(false);
	const [copied, setCopied] = useState<boolean>(false);
	const [task] = useRecoilState(detailedTaskState);
	const [title, setTitle] = useState<string>('');

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
				toast({
					variant: 'destructive',
					title: trans.TASK_TITLE_CHARACTER_LIMIT_ERROR_TITLE,
					description: trans.TASK_TITLE_CHARACTER_LIMIT_ERROR_DESCRIPTION,
				});
				return;
			}

			updateTitle(newTitle, task, true);
			setEdit(false);
		},
		[task, updateTitle, toast, trans]
	);

	const saveOnEnter = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'Enter' && edit) {
			saveTitle(title);
			setEdit(false);
		}
	};

	useEffect(() => {
		const handleOutsideClick = (event: MouseEvent) => {
			if (
				edit &&
				titleContainerRef.current &&
				!titleContainerRef.current.contains(event.target as Node)
			) {
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
		titleDOM.current?.style.setProperty(
			'height',
			titleDOM.current.scrollHeight + 'px'
		);
	};

	const copyTitle = () => {
		navigator.clipboard.writeText(title);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	const copyTaskNumber = () => {
		task && navigator.clipboard.writeText(task?.taskNumber);
	};

	const handleTaskTitleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		setTitle(event.target.value);
	};

	return (
		<div className="flex flex-col gap-[1.1875rem]" ref={titleContainerRef}>
			{task ? (
				<div className="flex gap-1">
					<textarea
						className={`w-full ${
							edit && 'textAreaOutline'
						} bg-transparent  resize-none text-black dark:text-white not-italic font-medium text-2xl items-start outline-1 rounded-[0.1875rem] border-2 border-transparent scrollbar-hide`}
						onChange={handleTaskTitleChange}
						onKeyDown={saveOnEnter}
						value={title}
						disabled={!edit}
						ref={titleDOM}
					></textarea>

					{edit ? (
						<div className="flex flex-col justify-start gap-1 transition-all">
							<button
								ref={saveButton}
								onClick={() => saveTitle(title)}
								className="border-2 dark:border-[#464242] rounded-md"
							>
								<TickIcon />
							</button>
							<button
								ref={cancelButton}
								onClick={cancelEdit}
								className="border-2 dark:border-[#464242] rounded-md"
							>
								<CloseAlternateIcon />
							</button>
						</div>
					) : (
						<div className="flex flex-col justify-start gap-1">
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

							<button className="text-[#B1AEBC]" onClick={copyTitle}>
								<Tooltip label={copied ? 'Copied' : 'Copy Title'} enabled>
									<Image
										src="/assets/svg/copy.svg"
										alt="edit header"
										width={17}
										height={17}
										style={{ height: '17px' }}
										className="cursor-pointer mr-1"
									/>
								</Tooltip>
							</button>
						</div>
					)}
				</div>
			) : (
				<TitleLoader />
			)}

			<div className="flex flex-col items-start">
				<div className="flex flex-row justify-start items-center gap-2 h-5">
					<div className="flex flex-row gap-[0.3125rem]">
						{/* Task number */}
						<div className="bg-[#D6D6D6] rounded-[0.1875rem] text-center min-w-48 flex justify-center items-center h-5 py-[0.0625rem] px-2.5">
							<span className="text-[#293241] font-medium text-xs">
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
							taskStatusClassName="h-5 text-[0.5rem] rounded-[0.1875rem] border-none"
						/>
					</div>
					{task?.issueType !== 'Epic' && task && (
						<div className="w-[0.0625rem] h-5 bg-[#DBDBDB]"></div>
					)}

					<div className="flex flex-row gap-1">
						{/* Creator Name */}
						{/* {task?.creator && (
							<div className="bg-[#E4ECF5] rounded-[0.1875rem] text-center min-w-48 h-5 flex justify-center items-center py-[0.0625rem] px-2.5">
								<span className="text-[#538ed2] font-medium text-[0.5rem]">
									{task.creator?.name}
								</span>
							</div>
						)} */}
						{/* Parent Issue/Task Name */}
						<ParentTaskBadge task={task} />
						<ParentTaskInput task={task} />
					</div>
				</div>

				<button
					className="flex gap-1 items-center text-[#B1AEBC] text-[0.5rem]"
					onClick={copyTaskNumber}
				>
					<CopyIconRounded className="stroke-[#B1AEBC]" />
					Copy Number
				</button>
			</div>
		</div>
	);
};

export default TaskTitleBlock;

const ParentTaskBadge = ({ task }: { task: ITeamTask | null }) => {
	return task?.parentId && task?.parent ? (
		<HoverCard>
			<HoverCardTrigger asChild>
				<Link
					href={`/task/${task.parentId}`}
					target="_blank"
					className="bg-[#C24A4A1A] rounded-[0.1875rem] text-center h-5 flex justify-center items-center py-[0.25rem] px-2.5"
				>
					<span className="text-[#C24A4A] font-medium text-[0.5rem] max-w-[10rem] overflow-hidden text-ellipsis whitespace-nowrap">
						<span className="text-[#C24A4A80]">{`#${task.parent.taskNumber}`}</span>
						{` - ${task.parent.title}`}
					</span>
				</Link>
			</HoverCardTrigger>
			<HoverCardContent className="w-80">
				<Link href={`/task/${task.parentId}`} target="_blank">
					<div className="flex justify-between space-x-4">
						<div className="space-y-1">
							<h4 className="text-xl font-semibold">{`#${task.parent.taskNumber}`}</h4>
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
const ParentTaskInput = ({ task }: { task: ITeamTask | null }) => {
	const modal = useModal();
	const { trans: translation } = useTranslation();

	return task && task.issueType !== 'Epic' ? (
		<div className="bg-transparent rounded text-center min-w-48 flex justify-center items-center cursor-pointer box-border h-5">
			<Button
				variant="outline-danger"
				className="text-[#f07258] font-medium text-[0.5rem] py-[0.25rem] px-2.5 min-w-[4.75rem] outline-none h-5 rounded-[0.1875rem]"
				onClick={modal.openModal}
			>
				{task.parentId
					? translation.common.CHANGE_PARENT
					: `+ ${translation.common.ADD_PARENT}`}
			</Button>

			<CreateParentTask modal={modal} task={task} />
		</div>
	) : (
		<></>
	);
};
