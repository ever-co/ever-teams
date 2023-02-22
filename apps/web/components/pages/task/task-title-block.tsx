import { useState, useRef } from 'react';
import Image from 'next/image';

interface ITitleBlockProps {
	title?: string;
}

const TaskTitleBlock = (props: ITitleBlockProps) => {
	const titleDOM = useRef<HTMLTextAreaElement>(null);
	const saveButton = useRef<HTMLButtonElement>(null);
	const cancelButton = useRef<HTMLButtonElement>(null);
	const editButton = useRef<HTMLButtonElement>(null);

	const [edit, setEdit] = useState<boolean>(false);
	const [title, setTitle] = useState<string>(
		props?.title ||
			'Working on UI Design & making prototype for user testing tomorrow Bernard'
	);

	const saveTitle = () => {
		setEdit(false);
	};

	const cancelEdit = () => {
		setEdit(false);
		setTitle(
			props?.title ||
				'Working on UI Design & making prototype for user testing tomorrow Bernard'
		);
	};

	const enableEdit = () => {
		setEdit(true);
		titleDOM.current?.focus();
	};

	return (
		<div className="flex mb-10 ">
			<textarea
				className="w-full bg-transparent resize-none h-auto text-black dark:text-white not-italic font-medium text-2xl mr-3 items-start py-1 outline-1 rounded-md outline-primary-light"
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
					<button ref={editButton} onClick={enableEdit}>
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
