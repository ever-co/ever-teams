import BlockButton from './editor-components/BlockButton';
import MarkButton from './editor-components/MarkButton';
import React, { useEffect, useRef, useState } from 'react';
import {
	insertLink,
	TextEditorService,
} from './editor-components/TextEditorService';

import {
	BoldIcon,
	ItalicIcon,
	UnderlineIcon,
	MoreIcon2,
	LinkIcon,
	AlignRightIcon,
	AlignLeftIcon,
	AlignCenterIcon,
	AlignJustifyIcon,
	CopyIcon,
	HeaderOneIcon,
	HeaderTwoIcon,
	UnorderedListIcon,
	OrderedListIcon,
	CodeBlockIcon,
	QuoteBlockIcon,
	ExternalLinkIcon,
	CheckBoxIcon,
} from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import { useSlateStatic } from 'slate-react';
import { Node, Element, Transforms, Editor } from 'slate';

interface IToolbarProps {
	isMarkActive?: (editor: any, format: string) => boolean;
	isBlockActive?: (editor: any, format: any, blockType?: string) => boolean;
}

const Toolbar = ({ isMarkActive, isBlockActive }: IToolbarProps) => {
	const { trans } = useTranslation('taskDetails');
	const editor = useSlateStatic();
	const [showLinkPopup, setShowLinkPopup] = useState(false);
	const [link, setLink] = useState('');
	const [copied, setCopied] = useState(false);
	const [linkPopupPosition, setLinkPopupPosition] = useState({
		left: 0,
		top: 0,
	});
	const [showDropdown, setShowDropdown] = useState(false);
	const blockButtonRef = useRef<any>(null);
	const popupRef = useRef<any>(null);
	const inputRef = useRef<any>(null);

	const handleLinkIconClick = () => {
		const selection = editor.selection;
		if (selection) {
			const domSelection = window.getSelection();
			const editorContainer = document.getElementById('editor-container');
			if (
				domSelection &&
				domSelection.rangeCount > 0 &&
				editorContainer &&
				editorContainer.contains(domSelection.anchorNode) &&
				editorContainer.contains(domSelection.focusNode)
			) {
				const range = domSelection.getRangeAt(0);
				const rect = range.getBoundingClientRect();
				setLinkPopupPosition({
					left: rect.left + window.pageXOffset,
					top: rect.bottom + window.pageYOffset,
				});
			}
		}
		setShowLinkPopup(true);
	};

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
						return node.children
							.map((child) => `\n${Node.string(child)}\n`)
							.join('');
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

	// const handleChange = (format: any) => {
	// 	setShowDropdown(false); // Close the dropdown when an option is selected

	// 	// Trigger a click event on the BlockButton
	// 	if (blockButtonRef.current) {
	// 		blockButtonRef.current.click();
	// 	}

	// 	// Apply the block format or text alignment to the editor using the isBlockActive function.
	// 	if (format) {
	// 		// Check if the format is for text alignment
	// 		const isTextAlignment = ['left', 'center', 'right', 'justify'].includes(
	// 			format
	// 		);

	// 		if (isTextAlignment) {
	// 			// Get the current selection
	// 			const selection = editor.selection;

	// 			if (selection) {
	// 				// Check if the selected nodes are blocks
	// 				const selectedBlocks = Array.from(
	// 					Editor.nodes(editor, {
	// 						at: selection,
	// 						match: (n) => Editor.isBlock(editor, n),
	// 					})
	// 				);

	// 				if (selectedBlocks.length > 0) {
	// 					// If any of the selected blocks have the same alignment, remove the alignment
	// 					const hasSameAlignment = selectedBlocks.every(
	// 						([node]) => node.type === format
	// 					);
	// 					if (hasSameAlignment) {
	// 						Transforms.unsetNodes(editor, 'align');
	// 					} else {
	// 						// Apply the alignment to all selected blocks
	// 						Transforms.setNodes(editor, { align: format });
	// 					}
	// 				} else {
	// 					// No blocks selected, so apply the alignment to the editor as a whole
	// 					Transforms.setNodes(editor, { align: format });
	// 				}
	// 			}
	// 		} else {
	// 			// If the format is not for text alignment, handle it as before for other block formats
	// 			const isActive = isBlockActive(editor, format);
	// 			if (isActive) {
	// 				Transforms.unwrapNodes(editor, {
	// 					match: (n: any) => n.type === format,
	// 					split: true,
	// 				});
	// 			} else {
	// 				Transforms.setNodes(editor, { type: format });
	// 			}
	// 		}
	// 	}
	// };

	return (
		<div className="flex flex-row justify-end items-center mb-3 mt-8 gap-1 border-b-2">
			<p className="flex-1 text-lg font-[500] dark:text-white my-1 hidden md:block">
				{trans.DESCRIPTION}
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
				format="h1"
				icon={HeaderOneIcon}
				isBlockActive={
					isBlockActive as (
						editor: any,
						format: any,
						blockType?: string | undefined
					) => boolean
				}
			/>
			<BlockButton
				format="h2"
				icon={HeaderTwoIcon}
				isBlockActive={
					isBlockActive as (
						editor: any,
						format: any,
						blockType?: string | undefined
					) => boolean
				}
			/>
			<BlockButton
				format="blockquote"
				icon={QuoteBlockIcon}
				isBlockActive={
					isBlockActive as (
						editor: any,
						format: any,
						blockType?: string | undefined
					) => boolean
				}
			/>
			<BlockButton
				format="ol"
				icon={OrderedListIcon}
				isBlockActive={
					isBlockActive as (
						editor: any,
						format: any,
						blockType?: string | undefined
					) => boolean
				}
			/>
			<BlockButton
				format="ul"
				icon={UnorderedListIcon}
				isBlockActive={
					isBlockActive as (
						editor: any,
						format: any,
						blockType?: string | undefined
					) => boolean
				}
			/>
			<div className="relative md:hidden">
				<button
					className="flex items-center gap-2 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:outline-none"
					onClick={() => setShowDropdown((prev) => !prev)}
				>
					<span>Select</span>
				</button>
				{showDropdown && (
					<div className="absolute top-full left-0 z-10 w-40 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded shadow">
						{blockOptions.map((option) => (
							<button
								key={option.format}
								className="flex items-center gap-1 px-2 py-1 w-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
								// onClick={() => handleChange(option.format)}
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
				)}
			</div>
			<BlockButton
				visibleOnLargeScreenOnly
				className="hidden md:block"
				format="left"
				icon={AlignLeftIcon}
				isBlockActive={
					isBlockActive as (
						editor: any,
						format: any,
						blockType?: string | undefined
					) => boolean
				}
			/>
			<BlockButton
				visibleOnLargeScreenOnly
				className="hidden md:block"
				format="center"
				icon={AlignCenterIcon}
				isBlockActive={
					isBlockActive as (
						editor: any,
						format: any,
						blockType?: string | undefined
					) => boolean
				}
			/>
			<BlockButton
				visibleOnLargeScreenOnly
				className="hidden md:block"
				format="right"
				icon={AlignRightIcon}
				isBlockActive={
					isBlockActive as (
						editor: any,
						format: any,
						blockType?: string | undefined
					) => boolean
				}
			/>
			<BlockButton
				visibleOnLargeScreenOnly
				className="hidden md:block"
				format="justify"
				icon={AlignJustifyIcon}
				isBlockActive={
					isBlockActive as (
						editor: any,
						format: any,
						blockType?: string | undefined
					) => boolean
				}
			/>
			<BlockButton
				format="checklist"
				icon={CheckBoxIcon}
				isBlockActive={
					isBlockActive as (
						editor: any,
						format: any,
						blockType?: string | undefined
					) => boolean
				}
			/>
			<button onClick={handleLinkIconClick} name="Insert Link">
				<LinkIcon />
			</button>
			{showLinkPopup && (
				<div
					onKeyDown={handleInsertLinkOnEnter}
					ref={popupRef}
					className="absolute flex items-center bg-white p-2 gap-1 rounded-md border border-gray-300 z-10"
					style={{
						left: linkPopupPosition.left,
						top: linkPopupPosition.top + 3,
					}}
				>
					<ExternalLinkIcon />
					<input
						type="text"
						className="outline-none font-[500] text-[#5000B9] dark:text-primary-light border-r border-gray-300 pr-2"
						onChange={(e) => setLink(e.target.value)}
						value={link}
						ref={inputRef}
					/>
					<button
						className="border-none bg-transparent hover:cursor-pointer ml-0"
						onClick={handleInsertLink}
					>
						<LinkIcon />
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
				<CopyIcon />
				{copied && (
					<div className="absolute bg-gray-400 rounded-lg dark:bg-gray-600 text-white text-xs p-2 top-[-45px] animate-pulse">
						Copied!
					</div>
				)}
			</button>
			{/* <MoreIcon2 /> */}
		</div>
	);
};
export default Toolbar;

const blockOptions = [
	{ format: 'h1', icon: HeaderOneIcon, label: 'Heading 1' },
	{ format: 'h2', icon: HeaderTwoIcon, label: 'Heading 2' },
	{ format: 'left', icon: AlignLeftIcon, label: 'Align Left' },
	{ format: 'center', icon: AlignCenterIcon, label: 'Align Center' },
	{ format: 'right', icon: AlignRightIcon, label: 'Align Right' },
	{ format: 'justify', icon: AlignJustifyIcon, label: 'Justify' },
];

const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];
const LIST_TYPES = ['ol', 'ul'];
