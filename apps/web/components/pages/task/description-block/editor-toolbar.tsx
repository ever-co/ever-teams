import BlockButton from './editor-components/BlockButton';
import MarkButton from './editor-components/MarkButton';
import React from 'react';

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
} from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import Image from 'next/image';

interface IToolbarProps {
	isMarkActive?: (editor: any, format: string) => boolean;
	isBlockActive?: (editor: any, format: any, blockType?: string) => boolean;
}

const Toolbar = ({ isMarkActive, isBlockActive }: IToolbarProps) => {
	const { trans } = useTranslation('taskDetails');
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
			<LinkIcon />
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
