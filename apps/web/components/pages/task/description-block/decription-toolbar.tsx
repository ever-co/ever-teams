import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
	FORMAT_TEXT_COMMAND,
	$getSelection,
	$isRangeSelection,
	COPY_COMMAND,
	FORMAT_ELEMENT_COMMAND,
	$createParagraphNode,
	COMMAND_PRIORITY_LOW,
} from 'lexical';
import {
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
	$createListNode,
	REMOVE_LIST_COMMAND,
	insertList,
} from '@lexical/list';

import { $wrapNodes } from '@lexical/selection';
import { $createHeadingNode } from '@lexical/rich-text';
import { mergeRegister } from '@lexical/utils';
import { useTranslation } from 'lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import ToolButton from './tool-button';
import {
	BoldIcon,
	ItalicIcon,
	UnderlineIcon,
	StrikethroughIcon,
	MoreIcon2,
	LinkIcon,
	AlignRightIcon,
	AlignLeftIcon,
	AlignCenterIcon,
	AlignJustifyIcon,
	CopyIcon,
	HeaderOneIcon,
	HeaderTwoIcon,
	NormalTextIcon,
} from 'lib/components/svgs';

const DescriptionToolbar = () => {
	const [editor] = useLexicalComposerContext();
	const { trans } = useTranslation('taskDetails');
	const [isBold, setIsBold] = useState(false);
	const [isItalic, setIsItalic] = useState(false);
	const [isUnderline, setIsUnderline] = useState(false);
	const [isStrikeThrough, setIsStrikeThrough] = useState(false);
	const [isUnorderedList, setUnorderedList] = useState(false);
	const [isOrderedList, setOrderedList] = useState(false);

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

	const toggleStrikeThrough = () => {
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
	};

	const toggleAlignRight = () => {
		editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
	};

	const toggleAlignLeft = () => {
		editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
	};

	const toggleAlignCenter = () => {
		editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
	};

	const toggleAlignJustify = () => {
		editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
	};

	const HeadingPlugin = (tag: 'h1' | 'h2'): void => {
		editor.update(() => {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				$wrapNodes(selection, () => $createHeadingNode(tag));
			}
		});
	};

	const ParagraphPlugin = (): void => {
		editor.update(() => {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				$wrapNodes(selection, () => $createParagraphNode());
			}
		});
	};
	// const ListPlugin = (): void => {
	// 	editor.update(() => {
	// 		const selection = $getSelection();
	// 		if ($isRangeSelection(selection)) {
	// 			$wrapNodes(selection, () => $createListNode('bullet'));
	// 		}
	// 	});
	// };

	// editor.registerCommand(
	// 	INSERT_UNORDERED_LIST_COMMAND,
	// 	() => {
	// 		insertList(editor, 'bullet');
	// 		return true;
	// 	},
	// 	COMMAND_PRIORITY_LOW
	// );

	function unorderedList() {
		if (!isUnorderedList) {
			editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
			setUnorderedList(true);
		} else {
			editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
			setUnorderedList(false);
		}
	}

	function orderedList() {
		if (!isOrderedList) {
			editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
			setOrderedList(true);
		} else {
			editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
			setOrderedList(false);
		}
	}

	const updateToolbar = useCallback(() => {
		const selection = $getSelection();
		if ($isRangeSelection(selection)) {
			setIsBold(selection?.hasFormat('bold'));
			setIsItalic(selection?.hasFormat('italic'));
			setIsUnderline(selection?.hasFormat('underline'));
			setIsStrikeThrough(selection?.hasFormat('strikethrough'));
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
					onSelect={unorderedList}
					icon={<HeaderOneIcon className="fill-black dark:fill-white" />}
				/>
				<ToolButton
					onSelect={orderedList}
					icon={<HeaderOneIcon className="fill-black dark:fill-white" />}
				/>
				<ToolButton
					onSelect={() => HeadingPlugin('h1')}
					icon={<HeaderOneIcon className="fill-black dark:fill-white" />}
				/>
				<ToolButton
					onSelect={() => HeadingPlugin('h2')}
					icon={<HeaderTwoIcon className="fill-black dark:fill-white" />}
				/>
				<ToolButton
					onSelect={ParagraphPlugin}
					icon={<NormalTextIcon className="fill-black dark:fill-white" />}
				/>
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
					activity={isStrikeThrough}
					onSelect={toggleStrikeThrough}
					icon={<StrikethroughIcon className="fill-black dark:fill-white" />}
				/>
				<ToolButton
					onSelect={toggleAlignLeft}
					icon={<AlignLeftIcon className="fill-black dark:fill-white" />}
				/>
				<ToolButton
					onSelect={toggleAlignCenter}
					icon={<AlignCenterIcon className="fill-black dark:fill-white" />}
				/>
				<ToolButton
					onSelect={toggleAlignRight}
					icon={<AlignRightIcon className="fill-black dark:fill-white" />}
				/>

				<ToolButton
					onSelect={toggleAlignJustify}
					icon={<AlignJustifyIcon className="fill-black dark:fill-white" />}
				/>
				<ToolButton
					onSelect={toggleAlignCenter}
					icon={<LinkIcon className=" dark:fill-white" />}
				/>

				<ToolButton
					onSelect={toggleCopy}
					icon={<CopyIcon className="fill-black dark:fill-white" />}
				/>
				<ToolButton iconSource="/assets/svg/tick-square.svg" />
				<ToolButton icon={<MoreIcon2 className="dark:fill-white" />} />
			</div>
		</div>
	);
};

export default DescriptionToolbar;
