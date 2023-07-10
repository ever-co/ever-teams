import { TextEditorService } from './TextEditorService';
import React from 'react';
import { useSlate } from 'slate-react';

interface IMarkButtonProps {
	format: string;
	icon: React.ComponentType;
	isMarkActive: (editor: any, format: string) => boolean;
}

const MarkButton = ({ format, icon: Icon, isMarkActive }: IMarkButtonProps) => {
	const editor = useSlate();

	return (
		<button
			style={{
				cursor: 'pointer',
				background: isMarkActive(editor, format) ? '#ddd' : 'transparent',
				border: 'none',
				borderRadius: '5px',
				// padding: '6px',
				transition: '0.3s',
				color: '#333',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
			onMouseDown={(event) => {
				event.preventDefault();
				TextEditorService.toggleMark(editor, format, isMarkActive);
			}}
		>
			<Icon />
		</button>
	);
};

export default MarkButton;
