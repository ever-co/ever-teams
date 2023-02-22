import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FORMAT_TEXT_COMMAND, $getSelection, $isRangeSelection } from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { useTranslation } from 'lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import ToolButton from './tool-button';

const DescriptionToolbar = () => {
	const [editor] = useLexicalComposerContext();
	const { trans } = useTranslation('taskDetails');
	const [isBold, setIsBold] = useState(false);
	const [isItalic, setIsItalic] = useState(false);
	const [isUnderline, setIsUnderline] = useState(false);

	const toggleBold = () => {
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
	};

	const toggleItalic = () => {
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
	};

	const toggleUnderline = () => {
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
	};

	const updateToolbar = useCallback(() => {
		const selection = $getSelection();
		if ($isRangeSelection(selection)) {
			setIsBold(selection?.hasFormat('bold'));
			setIsItalic(selection?.hasFormat('italic'));
			setIsUnderline(selection?.hasFormat('underline'));
		}
	}, [editor]);

	useEffect(() => {
		return mergeRegister(
			editor.registerUpdateListener(({ editorState }) => {
				editorState.read(() => {
					updateToolbar();
				});
			})
		);
	}, [editor, updateToolbar]);

	return (
		<div className=" w-full flex border-b-2 items-center">
			<div className="flex w-full justify-between  ">
				<h1 className="text-black dark:text-white font-medium text-m">
					{trans.DESCRIPTION}
				</h1>
			</div>
			<div className="flex">
				<ToolButton
					activity={isBold}
					onSelect={toggleBold}
					iconSource="/assets/svg/ph_text-bolder-bold.svg"
				/>
				<ToolButton
					activity={isItalic}
					onSelect={toggleItalic}
					iconSource="/assets/svg/ri_italic.svg"
				/>

				<ToolButton
					activity={isUnderline}
					onSelect={toggleUnderline}
					iconSource="/assets/svg/ri_font-size-2.svg"
				/>

				<ToolButton iconSource="/assets/svg/link.svg" />
				<ToolButton iconSource="/assets/svg/tick-square.svg" />
				<ToolButton iconSource="/assets/svg/more2.svg" />
			</div>
		</div>
	);
};

export default DescriptionToolbar;
