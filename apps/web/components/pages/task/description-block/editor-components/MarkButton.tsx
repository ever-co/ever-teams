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
			className="my-1"
			style={{
				cursor: 'pointer',
				background: isMarkActive(editor, format) ? '#ddd' : 'transparent',
				border: 'none',
				borderRadius: '5px',
				transition: '0.3s',
				padding: '2px',
				// display: 'flex',
				// alignItems: 'center',
				// justifyContent: 'center',
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
