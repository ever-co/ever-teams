import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { detailedTaskState } from '@app/stores';
import { useRecoilState } from 'recoil';

const TaskTitleBlock = () => {
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

	const saveTitle = () => {
		setEdit(false);
	};

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

	return (
		<div className="flex mb-10 ">
			<textarea
				className={`w-full bg-transparent resize-none h-auto text-black dark:text-white not-italic font-medium text-2xl mr-1 items-start p-2 outline-1 rounded-md outline-primary-light`}
				onChange={(event) => setTitle(event.target.value)}
				value={title}
				disabled={!edit}
				ref={titleDOM}
			></textarea>

			{edit ? (
				<div className="flex flex-col items-start">
					<button ref={saveButton} onClick={saveTitle}>
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
		</div>
	);
};
export default TaskTitleBlock;
