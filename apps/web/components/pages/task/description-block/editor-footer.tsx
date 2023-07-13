import React from 'react';
import { useTeamTasks } from '@app/hooks';
import { useCallback } from 'react';
import { detailedTaskState } from '@app/stores';
import { useRecoilState } from 'recoil';
import Image from 'next/image';
import { slateToHtml, SlateToDomConfig } from 'slate-serializers';
import {
	ELEMENT_NAME_TAG_MAP,
	MARK_ELEMENT_TAG_MAP,
} from './editor-components/TextEditorService';
import { Element } from 'domhandler';

const config: SlateToDomConfig = {
	elementStyleMap: { align: 'textAlign' },
	markMap: MARK_ELEMENT_TAG_MAP,
	elementMap: ELEMENT_NAME_TAG_MAP,
	elementTransforms: {
		link: ({ node, children = [] }) => {
			const attrs: any = {};
			if (node.linkType) {
				attrs['data-link-type'] = node.linkType;
			}
			if (node.newTab) {
				attrs.target = '_blank';
			}
			return new Element(
				'a',
				{
					href: node.href,
					...attrs,
				},
				children
			);
		},
	},
};

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

	// console.log(slateToHtml(editorValue, config));

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
							saveDescription(slateToHtml(editorValue, config));
							setIsUpdated();
						}}
						className={
							'bg-green-500 text-white px-4 py-1 m-2 rounded font-medium hover:bg-green-600 transition-all'
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
