import React from 'react';
import { useTeamTasks } from '@app/hooks';
import { useCallback } from 'react';
import { detailedTaskState } from '@app/stores';
import { useRecoilState } from 'recoil';
import Image from 'next/image';
import { slateToHtml } from 'slate-serializers';
import { configSlateToHtml } from './editor-components/serializerConfigurations';
import { Button } from 'lib/components';

interface IDFooterProps {
	isUpdated: boolean;
	setIsUpdated: () => void;
	editorValue?: any;
}

const EditorFooter = ({
	isUpdated,
	setIsUpdated,
	editorValue,
}: IDFooterProps) => {
	const [task] = useRecoilState(detailedTaskState);
	const { updateDescription } = useTeamTasks();

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
					<Button
						variant="grey"
						onClick={cancelEdit}
						className=" dark:bg-gray-500 font-medium min-w-[5rem] w-[3rem] text-sm px-6 py-2 m-1 rounded-lg transition-all"
					>
						Cancel
					</Button>
					<Button
						variant="primary"
						onClick={() => {
							saveDescription(slateToHtml(editorValue, configSlateToHtml));
							setIsUpdated();
						}}
						className={
							'bg-primary min-w-[5rem] w-[3rem] text-sm text-white px-6 py-2 m-1 rounded-lg font-medium transition-all'
						}
					>
						Save
					</Button>
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
					className="cursor-pointer mr-1 mb-0 mt-2"
				/>
			</div>
		</div>
	);
};

export default EditorFooter;
