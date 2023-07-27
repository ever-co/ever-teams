import { clsxm } from '@app/utils';
import { TextEditorService } from './TextEditorService';
import React from 'react';
import { useSlate } from 'slate-react';

interface IMarkButtonProps {
	format: string;
	icon: React.ComponentType;
	isBlockActive: (editor: any, format: any, blockType?: string) => boolean;
	className?: string;
	visibleOnLargeScreenOnly?: boolean;
}

const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];
const LIST_TYPES = ['ol', 'ul'];

const BlockButton = ({
	format,
	icon: Icon,
	isBlockActive,
	className,
	visibleOnLargeScreenOnly = false,
}: IMarkButtonProps) => {
	const editor = useSlate();

	return (
		<button
			className={clsxm(
				className,
				'my-1',
				visibleOnLargeScreenOnly ? 'hidden md:block' : ''
			)}
			style={{
				background: isBlockActive(
					editor,
					format,
					TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
				)
					? '#ddd'
					: 'transparent',
				borderRadius: '5px',
				padding: '2px',
				// display: 'flex',
				// alignItems: 'center',
				// justifyContent: 'center',
				transition: '0.3s',
			}}
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
