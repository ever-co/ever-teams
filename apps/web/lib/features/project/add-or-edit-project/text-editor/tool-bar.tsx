import React, { useEffect, useRef, useState } from 'react';
import {
	AlignCenterIcon,
	AlignLeftIcon,
	AlignRightIcon,
	ThreeNumberLineIcon as OrderedListIcon,
	ThreeDotLineIcon as UnorderedListIcon,
	UnderlineTextIcon as UnderlineIcon,
	ItalicTextIcon as ItalicIcon,
	BTextIcon as BoldIcon,
	AlignFullIcon
} from 'assets/svg';
import MarkButton from '@components/pages/task/description-block/editor-components/MarkButton';
import BlockButton from '@components/pages/task/description-block/editor-components/BlockButton';

interface IToolbarProps {
	isMarkActive?: (editor: any, format: string) => boolean;
	isBlockActive?: (editor: any, format: any, blockType?: string) => boolean;
}

const Toolbar = ({ isMarkActive, isBlockActive }: IToolbarProps) => {
	const [showLinkPopup, setShowLinkPopup] = useState(false);
	const popupRef = useRef<any>(null);
	const inputRef = useRef<any>(null);

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

	return (
		<div className="flex py-1 px-2 border-b">
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
		</div>
	);
};
export default Toolbar;
