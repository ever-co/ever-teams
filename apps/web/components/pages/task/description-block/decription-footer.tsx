import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useTeamTasks } from '@app/hooks';
import { useCallback } from 'react';
import { detailedTaskState } from '@app/stores';
import { useRecoilState } from 'recoil';
import Image from 'next/image';

interface IDFooterProps {
	isUpdated: boolean;
	setIsUpdated: () => void;
}

const DescriptionFooter = (props: IDFooterProps) => {
	const [editor] = useLexicalComposerContext();
	const [task] = useRecoilState(detailedTaskState);
	const { updateDescription } = useTeamTasks();

	const saveDescription = useCallback(
		(newTitle: string) => {
			updateDescription(newTitle, task, true);
		},
		[task, updateDescription]
	);

	const cancelEdit = () => {
		props.setIsUpdated();
	};

	return (
		<div>
			{props.isUpdated && (
				<div className='flex justify-end'>
					<button
						onClick={cancelEdit}
						className="font-medium transition-all hover:font-semibold"
					>
						Cancel
					</button>
					<button
						onClick={() => {
							saveDescription(JSON.stringify(editor.getEditorState()));
							props.setIsUpdated();
						}}
						className={
							'bg-green-500 text-white px-4 py-1 m-2 rounded font-medium hover:bg-green-600 transition-all'
						}
					>
						Save
					</button>
				</div>
			)}
			<div className="flex justify-between items-center mt-4">
				<div>
					<label className="text-xs text-gray-300">Acceptance Criteria</label>
				</div>
				<Image
					src="/assets/svg/arrow-up.svg"
					alt="arrow"
					width={18}
					height={18}
					style={{ height: '28px' }}
					className="cursor-pointer mr-1"
				/>
			</div>
		</div>
	);
};
export default DescriptionFooter;
