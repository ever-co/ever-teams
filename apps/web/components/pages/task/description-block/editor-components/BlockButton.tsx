import { clsxm } from '@app/utils';
import { TextEditorService } from './TextEditorService';
import React from 'react';
import { useSlate } from 'slate-react';

interface IMarkButtonProps {
	format: string;
	icon: React.ComponentType;
	isBlockActive: (editor: any, format: any, blockType?: string) => boolean;
	className?: string;
}

const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];
const LIST_TYPES = ['ol', 'ul'];

const BlockButton = ({
	format,
	icon: Icon,
	isBlockActive,
	className,
}: IMarkButtonProps) => {
	const editor = useSlate();

	return (
		<button
			className={clsxm(
				className,
				'my-1 rounded-md transition duration-300 p-[2px]',
				isBlockActive(
					editor,
					format,
					TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
				)
					? 'dark:bg-[#6a6a6a] bg-[#ddd]'
					: 'bg-transparent'
			)}
			onMouseDown={(event) => {
				event.preventDefault();
				TextEditorService.toggleBlock(
					editor,
					format,
					isBlockActive,
					LIST_TYPES,
					TEXT_ALIGN_TYPES
				);
			}}
		>
			<Icon />
		</button>
	);
};
export default BlockButton;
