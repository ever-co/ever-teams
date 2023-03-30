import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { detailedTaskState } from '@app/stores';
import { useRecoilState } from 'recoil';
import { useTeamTasks } from '@app/hooks';
import TitleLoader from './title-loader';

const TaskTitleBlock = () => {
	const { updateTitle } = useTeamTasks();
	// const { updateLoading } = useTeamTasks();

	//DOM elements
	const titleDOM = useRef<HTMLTextAreaElement>(null);
	const saveButton = useRef<HTMLButtonElement>(null);
	const cancelButton = useRef<HTMLButtonElement>(null);
	const editButton = useRef<HTMLButtonElement>(null);

	//States
	const [edit, setEdit] = useState<boolean>(false);
	const [task] = useRecoilState(detailedTaskState);
	const [title, setTitle] = useState<string>('');

	//Hooks and functions
	useEffect(() => {
		task && setTitle(task?.title);
	}, [task]);

	useEffect(() => {
		autoTextAreaHeight();
	}, [title]);

	useEffect(() => {
		titleDOM?.current?.focus();
	}, [edit]);

	const saveTitle = useCallback(
		(newTitle: string) => {
			updateTitle(newTitle, task, true);
			setEdit(false);
		},
		[task, updateTitle]
	);

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
	};

	return (
		<div className="flex md:mb-10  ">
			{title !== '' ? (
				<>
					<div className="w-full flex flex-wrap">
						<textarea
							className={`w-full bg-transparent resize-none h-auto text-black dark:text-white not-italic font-medium text-2xl mr-1 items-start px-2 outline-1 rounded-md outline-0 border border-transparent focus:border-primary-light scrollbar-hide`}
							onChange={(event) => setTitle(event.target.value)}
							value={title}
							disabled={!edit}
							ref={titleDOM}
						></textarea>
						<div className="flex flex-col space-y-2">
							<button
								className="flex items-center text-[#B1AEBC] text-xs ml-2"
								onClick={copyTitle}
							>
								<Image
									src="/assets/svg/copy.svg"
									alt="edit header"
									width={18}
									height={18}
									style={{ height: '28px' }}
									className="cursor-pointer mr-1"
								/>
								Copy Title
							</button>
							<div className="flex justify-between">
								<div className="ml-2 bg-[#D6D6D6] rounded-md text-center w-20 h-9 mr-4 flex justify-center items-center ">
									<span className="text-black font-medium text-xs ">
										#{task?.taskNumber}
									</span>
								</div>
							</div>
						</div>
					</div>

					{edit ? (
						<div className="flex flex-col items-start transition-all ">
							<button ref={saveButton} onClick={() => saveTitle(title)}>
								<Image
									src="/assets/svg/tick.svg"
									alt="edit header"
									width={28}
									height={28}
									style={{ height: '28px' }}
									className="cursor-pointer"
								/>
							</button>
							<button ref={cancelButton} onClick={cancelEdit}>
								<Image
									src="/assets/svg/close.svg"
									alt="edit header"
									width={28}
									height={28}
									style={{ height: '28px' }}
									className="cursor-pointer "
								/>
							</button>
						</div>
					) : (
						<div className="flex flex-col items-start">
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
						</div>
					)}
				</>
			) : (
				<TitleLoader />
			)}
		</div>
	);
};
export default TaskTitleBlock;
