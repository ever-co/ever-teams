import React from 'react';
import { useTeamTasks } from '@app/hooks';
import { useCallback } from 'react';
import { detailedTaskState } from '@app/stores';
import { useRecoilState } from 'recoil';
import Image from 'next/image';
import { useSlate } from 'slate-react';

interface IDFooterProps {
	isUpdated: boolean;
	setIsUpdated: () => void;
}

const EditorFooter = ({ isUpdated, setIsUpdated }: IDFooterProps) => {
	const [task] = useRecoilState(detailedTaskState);
	const { updateDescription } = useTeamTasks();
	const editor = useSlate();
	const editorValue = editor.children;

	const saveDescription = useCallback(
		(newDescription: string) => {
			updateDescription(newDescription, task, true);
		},
		[task, updateDescription]
	);

	const cancelEdit = () => {
		setIsUpdated();
	};
	return (
		<div>
			{isUpdated && (
				<div className="flex justify-end mb-0">
					<button
						onClick={cancelEdit}
						className="font-medium transition-all hover:font-semibold"
					>
						Cancel
					</button>
					<button
						onClick={() => {
							saveDescription(JSON.stringify(editorValue));
							setIsUpdated();
						}}
						className={
							'bg-green-500 text-white px-4 py-1 m-2 mb-0 rounded font-medium hover:bg-green-600 transition-all'
						}
					>
						Save
					</button>
				</div>
			)}
			<div className="flex justify-between items-end mt-0 border-b-2">
				<div>
					<label className="text-xs text-gray-300">Acceptance Criteria</label>
				</div>
				<Image
					src="/assets/svg/arrow-up.svg"
					alt="arrow"
					width={18}
					height={18}
					style={{ height: '28px' }}
					className="cursor-pointer mr-1 mb-0"
				/>
			</div>
		</div>
	);
};

export default EditorFooter;
