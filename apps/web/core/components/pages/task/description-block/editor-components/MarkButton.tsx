import { clsxm } from '@app/utils';
import { TextEditorService } from './TextEditorService';
import React from 'react';
import { useSlate } from 'slate-react';

interface IMarkButtonProps {
	format: string;
	icon: any;
	isMarkActive: (editor: any, format: string) => boolean;
}

const MarkButton = ({ format, icon: Icon, isMarkActive }: IMarkButtonProps) => {
	const editor = useSlate();

	return (
		<button
			className={clsxm(
				'my-1 rounded-md transition duration-300 p-[2px]',
				isMarkActive(editor, format) ? 'dark:bg-[#47484D] bg-[#ddd]' : 'bg-transparent'
			)}
			onMouseDown={(event) => {
				event.preventDefault();
				TextEditorService.toggleMark(editor, format, isMarkActive);
			}}
		>
			<Icon className="h-5 w-5" />
		</button>
	);
};

export default MarkButton;
