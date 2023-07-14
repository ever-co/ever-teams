import BlockButton from './editor-components/BlockButton';
import MarkButton from './editor-components/MarkButton';
import React, { useEffect, useRef, useState } from 'react';
import { insertLink } from './editor-components/TextEditorService';

import {
	BoldIcon,
	ItalicIcon,
	UnderlineIcon,
	// StrikethroughIcon,
	MoreIcon2,
	LinkIcon,
	AlignRightIcon,
	AlignLeftIcon,
	AlignCenterIcon,
	AlignJustifyIcon,
	CopyIcon,
	HeaderOneIcon,
	HeaderTwoIcon,
	// NormalTextIcon,
	UnorderedListIcon,
	OrderedListIcon,
	CodeBlockIcon,
	QuoteBlockIcon,
	ExternalLinkIcon,
} from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import Image from 'next/image';
import { useFocused, useSlateStatic } from 'slate-react';

interface IToolbarProps {
	isMarkActive?: (editor: any, format: string) => boolean;
	isBlockActive?: (editor: any, format: any, blockType?: string) => boolean;
}

const Toolbar = ({ isMarkActive, isBlockActive }: IToolbarProps) => {
	const { trans } = useTranslation('taskDetails');
	const editor = useSlateStatic();
	const [showLinkPopup, setShowLinkPopup] = useState(false);
	const [link, setLink] = useState('');
	const [linkPopupPosition, setLinkPopupPosition] = useState({
		left: 0,
		top: 0,
	});
	const popupRef = useRef<any>(null);

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
		// const url = prompt('Enter a URL');

		insertLink(editor, link);
		setShowLinkPopup(false);
	};

	return (
		<div className="flex flex-row justify-end items-center mb-3 mt-8 gap-1 border-b-2">
			<p className="flex-1 text-lg font-[500] dark:text-white my-1">
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
			<BlockButton
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
			<button onClick={handleLinkIconClick} name="Insert Link">
				<LinkIcon />
			</button>
			{showLinkPopup && (
				<div
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
						className="outline-none   text-[#5000B9] dark:text-primary-light"
						onChange={(e) => setLink(e.target.value)}
						value={link}
					/>
					<button
						className="border-none bg-transparent hover:cursor-pointer ml-0"
						onClick={handleInsertLink}
					>
						<LinkIcon />
					</button>
				</div>
			)}
			<Image
				src="/assets/svg/tick-square.svg"
				alt="check-button"
				width={20}
				height={20}
				className="m-0"
			/>
			<CopyIcon />
			<MoreIcon2 />
		</div>
	);
};
export default Toolbar;
