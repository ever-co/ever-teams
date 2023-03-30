import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
	FORMAT_TEXT_COMMAND,
	$getSelection,
	$isRangeSelection,
	COPY_COMMAND,
} from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { useTranslation } from 'lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import ToolButton from './tool-button';
import {
	BoldIcon,
	ItalicIcon,
	UnderlineIcon,
	MoreIcon2,
	LinkIcon,
} from 'lib/components/svgs';

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

	const toggleCopy = () => {
		editor.dispatchCommand(COPY_COMMAND, event as ClipboardEvent);
	};

	const updateToolbar = useCallback(() => {
		const selection = $getSelection();
		if ($isRangeSelection(selection)) {
			setIsBold(selection?.hasFormat('bold'));
			setIsItalic(selection?.hasFormat('italic'));
			setIsUnderline(selection?.hasFormat('underline'));
		}
	}, []);

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
		<div className="flex items-center w-full border-b-2 ">
			<div className="flex justify-between w-full ">
				<h1 className="font-medium text-black dark:text-white text-m">
					{trans.DESCRIPTION}
				</h1>
			</div>
			<div className="flex">
				<ToolButton
					activity={isBold}
					onSelect={toggleBold}
					icon={<BoldIcon className="fill-black dark:fill-white" />}
				/>
				<ToolButton
					activity={isItalic}
					onSelect={toggleItalic}
					icon={<ItalicIcon className="fill-black dark:fill-white" />}
				/>

				<ToolButton
					activity={isUnderline}
					onSelect={toggleUnderline}
					icon={<UnderlineIcon className="fill-black dark:fill-white" />}
				/>

				<ToolButton
					onSelect={toggleCopy}
					icon={<LinkIcon className="stroke-black dark:stroke-white" />}
				/>
				<ToolButton iconSource="/assets/svg/tick-square.svg" />
				<ToolButton icon={<MoreIcon2 className="dark:fill-white" />} />
			</div>
		</div>
	);
};

export default DescriptionToolbar;
