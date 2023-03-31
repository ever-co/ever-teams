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

	const copyTaskNumber = () => {
		task && navigator.clipboard.writeText(task?.taskNumber);
	}

	return (
		<>
			<div className="flex mb-6 ">
				{title !== '' ? (
					<>
						<div className="w-full flex flex-wrap">
							<textarea
								className={`w-4/5 bg-transparent resize-none text-black dark:text-white not-italic font-medium md:text-4xl text-2xl items-start pl-2 outline-1 rounded-md outline-0 border border-transparent focus:border-primary-light scrollbar-hide md:!leading-[47px]`}
								onChange={(event) => setTitle(event.target.value)}
								value={title}
								disabled={!edit}
								ref={titleDOM}
							></textarea>
							<button
								className="flex items-center text-[#B1AEBC] text-xs xl:-ml-8 md:mt-14 mt-0"
								onClick={copyTitle}
							>
								<Image
									src="/assets/svg/copy.svg"
									alt="edit header"
									width={17}
									height={17}
									style={{ height: '17px' }}
									className="cursor-pointer mr-1"
								/>
								Copy Title
							</button>
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
			<div className="flex">
				<div className="ml-2 bg-[#D6D6D6] rounded text-center w-12 h-6 mr-4 flex justify-center items-center ">
					<span className="text-black font-medium text-xs ">
						#{task?.taskNumber}
					</span>
				</div>
			</div>
			<button
				className="flex items-center text-[#B1AEBC] text-xs ml-2 mt-1"
				onClick={copyTaskNumber}
			>
				<Image
					src="/assets/svg/copy.svg"
					alt="edit header"
					width={11}
					height={11}
					style={{ height: '11px' }}
					className="cursor-pointer mr-1"
				/>
				Copy Number
			</button>
		</>
	);
};
export default TaskTitleBlock;
