import React, { useCallback, useEffect, useRef, useState } from 'react';
import BlockButton from './editor-components/BlockButton';
import MarkButton from './editor-components/MarkButton';
import { insertLink } from './editor-components/TextEditorService';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Button, InputField } from '@/core/components';
import { Element, Node } from 'slate';
import { useSlateStatic } from 'slate-react';
import { useTranslations } from 'next-intl';
import {
	AlignQuoteIcon,
	CodeIcon as CodeBlockIcon,
	ExternalLinkIcon,
	LinkRoundIcon,
	AlignCenterIcon,
	AlignLeftIcon,
	AlignRightIcon,
	H1TextIcon as HeaderOneIcon,
	H2TextIcon as HeaderTwoIcon,
	ThreeNumberLineIcon as OrderedListIcon,
	ThreeDotLineIcon as UnorderedListIcon,
	UnderlineTextIcon as UnderlineIcon,
	ItalicTextIcon as ItalicIcon,
	BTextIcon as BoldIcon,
	CheckSquareRoundIcon as CheckBoxIcon,
	CopyRoundIcon as CopyIconRounded,
	AlignFullIcon,
	ChevronDownIcon
} from 'assets/svg';
import { clsxm } from '@/core/lib/utils';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { IconsCloseRounded, IconsEmojiEmotions } from '@/core/components/icons';

interface IToolbarProps {
	isMarkActive?: (editor: any, format: string) => boolean;
	isBlockActive?: (editor: any, format: any, blockType?: string) => boolean;
	selectEmoji?: (emoji: { native: string }) => void;
	showEmojiIcon?: boolean;
}

const Toolbar = ({ isMarkActive, isBlockActive, selectEmoji, showEmojiIcon }: IToolbarProps) => {
	const t = useTranslations();
	const editor = useSlateStatic();
	const [showLinkPopup, setShowLinkPopup] = useState(false);
	const [link, setLink] = useState('');
	const [copied, setCopied] = useState(false);
	const [linkPopupPosition] = useState({
		left: 0,
		top: 0
	});
	const [showDropdown, setShowDropdown] = useState(false);
	const [showEmoji, setShowEmoji] = useState(false);
	const popupRef = useRef<any>(null);
	const inputRef = useRef<any>(null);
	const dropdownRef = useRef<any>(null);
	const emojiRef = useRef<any>(null);

	// const handleLinkIconClick = () => {
	// 	const selection = editor.selection;
	// 	if (selection) {
	// 		const domSelection = window.getSelection();
	// 		const editorContainer = document.getElementById('editor-container');
	// 		if (
	// 			domSelection &&
	// 			domSelection.rangeCount > 0 &&
	// 			editorContainer &&
	// 			editorContainer.contains(domSelection.anchorNode) &&
	// 			editorContainer.contains(domSelection.focusNode)
	// 		) {
	// 			const range = domSelection.getRangeAt(0);
	// 			const rect = range.getBoundingClientRect();
	// 			setLinkPopupPosition({
	// 				left: rect.left + window.pageXOffset,
	// 				top: rect.bottom + window.pageYOffset,
	// 			});
	// 		}
	// 	}
	// 	setShowLinkPopup(true);
	// };

	useEffect(() => {
		if (showLinkPopup) {
			inputRef.current.focus();
		}
	}, [showLinkPopup]);

	useEffect(() => {
		const onClickOutsideOfPopup = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				popupRef.current &&
				!popupRef.current.contains(target) &&
				!target.closest('button[name="Insert Link"]')
			) {
				setShowLinkPopup(false);
			}
		};

		window.addEventListener('click', onClickOutsideOfPopup);

		return () => window.removeEventListener('click', onClickOutsideOfPopup);
	}, [showLinkPopup]);

	const handleInsertLink = () => {
		insertLink(editor, link);
		setShowLinkPopup(false);
		setLink('');
	};

	const handleInsertLinkOnEnter = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleInsertLink();
		}
	};

	const handleCopy = (editor: any) => {
		const serializedText = (nodes: Node[]) => {
			return nodes
				.map((node) => {
					if (
						Element.isElement(node) &&
						//@ts-ignore
						(node.type === 'ul' || node.type === 'ol')
					) {
						return node.children.map((child) => `\n${Node.string(child)}\n`).join('');
					}
					return Node.string(node);
				})
				.join('\n');
		};

		const plainText = serializedText(editor.children);
		window.navigator.clipboard.writeText(plainText);
	};
	const copyPopupHandler = (): void => {
		setCopied(true);
		setTimeout(() => {
			setCopied(false);
		}, 1000);
	};

	const onClickOutsideOfDropdown = useCallback((event: MouseEvent) => {
		const target = event.target as HTMLElement;
		if (dropdownRef.current && !dropdownRef.current.contains(target)) {
			setShowDropdown(false);
		}
	}, []);

	useEffect(() => {
		document.addEventListener('click', onClickOutsideOfDropdown);

		return () => {
			document.removeEventListener('click', onClickOutsideOfDropdown);
		};
	}, [onClickOutsideOfDropdown]);

	useEffect(() => {
		const handleClickOutsideOfEmoji = (event: MouseEvent) => {
			if (emojiRef.current && !emojiRef.current.contains(event.target as unknown as Node)) {
				setShowEmoji(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutsideOfEmoji);
		return () => {
			document.removeEventListener('mousedown', handleClickOutsideOfEmoji);
		};
	}, [setShowEmoji]);

	const addEmoji = (emoji: { native: string }) => {
		if (showEmojiIcon) {
			selectEmoji?.(emoji);
		}
	};

	// const isBlockActiveMemo = useMemo(() => {
	// 	return (
	// 		isBlockActive &&
	// 		((format: string) => {
	// 			return isBlockActive(
	// 				editor,
	// 				format,
	// 				TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
	// 			);
	// 		})
	// 	);
	// }, [editor, isBlockActive]);

	return (
		<div className="flex flex-row items-center justify-end gap-1 mt-8 relative">
			<p className="flex-1 text-lg font-[500] dark:text-white my-1 hidden md:block">
				{t('pages.taskDetails.DESCRIPTION')}
			</p>

			<MarkButton
				format="bold"
				icon={BoldIcon}
				isMarkActive={isMarkActive as (editor: any, format: string) => boolean}
			/>
			<MarkButton
				format="italic"
				icon={ItalicIcon}
				isMarkActive={isMarkActive as (editor: any, format: string) => boolean}
			/>
			<MarkButton
				format="underline"
				icon={UnderlineIcon}
				isMarkActive={isMarkActive as (editor: any, format: string) => boolean}
			/>
			<MarkButton
				format="code"
				icon={CodeBlockIcon}
				isMarkActive={isMarkActive as (editor: any, format: string) => boolean}
			/>
			<BlockButton
				className="hidden md:block"
				format="h1"
				icon={HeaderOneIcon}
				isBlockActive={isBlockActive as (editor: any, format: any, blockType?: string | undefined) => boolean}
			/>
			<BlockButton
				className="hidden md:block"
				format="h2"
				icon={HeaderTwoIcon}
				isBlockActive={isBlockActive as (editor: any, format: any, blockType?: string | undefined) => boolean}
			/>
			<BlockButton
				format="blockquote"
				icon={AlignQuoteIcon}
				isBlockActive={isBlockActive as (editor: any, format: any, blockType?: string | undefined) => boolean}
			/>
			<BlockButton
				className="hidden md:block"
				format="ol"
				icon={OrderedListIcon}
				isBlockActive={isBlockActive as (editor: any, format: any, blockType?: string | undefined) => boolean}
			/>
			<BlockButton
				className="hidden md:block"
				format="ul"
				icon={UnorderedListIcon}
				isBlockActive={isBlockActive as (editor: any, format: any, blockType?: string | undefined) => boolean}
			/>
			<BlockButton
				className="hidden md:block"
				format="left"
				icon={AlignLeftIcon}
				isBlockActive={isBlockActive as (editor: any, format: any, blockType?: string | undefined) => boolean}
			/>
			<BlockButton
				className="hidden md:block"
				format="center"
				icon={AlignCenterIcon}
				isBlockActive={isBlockActive as (editor: any, format: any, blockType?: string | undefined) => boolean}
			/>
			<BlockButton
				className="hidden md:block"
				format="right"
				icon={AlignRightIcon}
				isBlockActive={isBlockActive as (editor: any, format: any, blockType?: string | undefined) => boolean}
			/>
			<BlockButton
				className="hidden md:block"
				format="justify"
				icon={AlignFullIcon}
				isBlockActive={isBlockActive as (editor: any, format: any, blockType?: string | undefined) => boolean}
			/>

			<IconsEmojiEmotions onMouseOver={() => setShowEmoji(true)} className={clsxm('mr-3')} />
			{showEmoji && (
				<div className="absolute  right-4 z-50 top-12" ref={emojiRef}>
					<div className="relative h-[20px] w-full">
						<IconsCloseRounded
							onClick={() => setShowEmoji(false)}
							className="absolute right-5 cursor-pointer size-14"
						/>
					</div>
					<Picker
						data={data}
						emojiSize={20}
						emojiButtonSize={28}
						onEmojiSelect={addEmoji}
						maxFrequentRows={0}
					/>
				</div>
			)}

			<div className="relative md:hidden" ref={dropdownRef}>
				<Button
					className={`flex items-center text-md px-2 min-w-[3.125rem] py-[2px] bg-transparent dark:bg-dark--theme rounded-md focus:outline-none`}
					onClick={() => setShowDropdown((prev) => !prev)}
				>
					<span className="flex items-center gap-1 my-0 text-black dark:text-white">
						More
						<ChevronDownIcon className={`${showDropdown && 'rotate-180'}`} />
					</span>
				</Button>
				{/* {showDropdown && (
					<div className="absolute left-0 z-10 w-40 py-2 bg-white border border-gray-300 rounded shadow top-full dark:bg-dark--theme-light dark:border-gray-700">
						{blockOptions.map((option) => (
							<button
								key={option.format}
								className={`flex items-center gap-1 px-2 py-1 w-full focus:outline-none rounded-sm transition duration-300 ${
									isBlockActiveMemo && isBlockActiveMemo(option.format)
										? 'dark:bg-[#6a6a6a] bg-[#ddd]'
										: 'bg-transparent'
								} `}
								onMouseDown={(event) => {
									event.preventDefault();
									TextEditorService.toggleBlock(
										editor,
										option.format,
										//@ts-ignore
										isBlockActive,
										LIST_TYPES,
										TEXT_ALIGN_TYPES
									);
									setShowDropdown(false);
								}}
							>
								<BlockButton
									format={option.format}
									icon={option.icon}
									isBlockActive={
										isBlockActive as (editor: any, format: string) => boolean
									}
								/>
								<span className="text-sm">{option.label}</span>
							</button>
						))}
					</div>
				)} */}
			</div>
			<BlockButton
				format="checklist"
				icon={CheckBoxIcon}
				isBlockActive={isBlockActive as (editor: any, format: any, blockType?: string | undefined) => boolean}
			/>
			{/* <button onClick={handleLinkIconClick} name="Insert Link">
				<LinkIcon />
			</button> */}
			<Popover>
				<PopoverTrigger asChild>
					<LinkRoundIcon className="h-5 w-5" />
				</PopoverTrigger>
				<PopoverContent className="flex flex-row items-center">
					<InputField
						type="text"
						className="outline-none h-10 text-xs text-[#5000B9] dark:text-primary-light border-r dark:bg-dark--theme-light"
						wrapperClassName="mb-0"
						onChange={(e) => setLink(e.target.value)}
						value={link}
						ref={inputRef}
					/>
					<Button onClick={handleInsertLink} variant="ghost" className="h-10 min-w-0">
						<LinkRoundIcon className="h-5 w-5" />
					</Button>
				</PopoverContent>
			</Popover>
			{showLinkPopup && ( // this block of code is not working because onclick function is commented out
				<div
					onKeyDown={handleInsertLinkOnEnter}
					ref={popupRef}
					className="absolute flex items-center bg-white dark:bg-dark--theme-light p-2 gap-1 rounded-md border border-gray-300 dark:border-[#7B8089] z-10"
					style={{
						left: linkPopupPosition.left,
						top: linkPopupPosition.top + 3
					}}
				>
					<ExternalLinkIcon className="h-4 w-4" />
					<input
						type="text"
						className="outline-none font-[500] text-xs text-[#5000B9] dark:text-primary-light border-r dark:bg-dark--theme-light pr-2"
						onChange={(e) => setLink(e.target.value)}
						value={'new'}
						ref={inputRef}
					/>
					<button className="ml-0 bg-transparent border-none hover:cursor-pointer" onClick={handleInsertLink}>
						<LinkRoundIcon className="h-5 w-5" />
					</button>
				</div>
			)}
			<button
				onClick={() => {
					handleCopy(editor), copyPopupHandler();
				}}
				className={`${!copied && 'active:transform active:scale-95'} relative`}
				disabled={copied}
			>
				<CopyIconRounded className="w-4 h-4 stroke-[#282048] dark:stroke-white" />
				{copied && (
					<div className="absolute bg-gray-400 rounded-lg dark:bg-gray-600 text-white text-xs p-2 top-[-45px] animate-pulse">
						Copied!
					</div>
				)}
			</button>
			{/* <ThreeCircleOutlineVerticalIcon className="w-full max-w-[24px]" /> */}
		</div>
	);
};
export default Toolbar;

// const blockOptions = [
// 	{ format: 'h1', icon: HeaderOneIcon, label: 'Heading 1' },
// 	{ format: 'h2', icon: HeaderTwoIcon, label: 'Heading 2' },
// 	{ format: 'ol', icon: OrderedListIcon, label: 'Ordered List' },
// 	{ format: 'ul', icon: UnorderedListIcon, label: 'Unordered List' },
// 	{ format: 'left', icon: AlignLeftIcon, label: 'Align Left' },
// 	{ format: 'center', icon: AlignCenterIcon, label: 'Align Center' },
// 	{ format: 'right', icon: AlignRightIcon, label: 'Align Right' },
// 	{ format: 'justify', icon: AlignJustifyIcon, label: 'Justify' },
// ];

// const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];
// const LIST_TYPES = ['ol', 'ul'];
