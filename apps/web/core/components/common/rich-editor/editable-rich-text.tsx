'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Pencil } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { preloadRichEditor } from './lazy-rich-editor';
import { RichTextView } from './rich-text-view';

const EMPTY_EDITABLE =
	'flex min-h-11 w-full items-center rounded-xl hairline-border border-dashed border-foreground/20 px-4 py-2.5 text-left text-[13px] text-muted-foreground outline-none transition-colors hover:border-foreground/35 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:pointer-events-none';

const READ_SURFACES = {
	card: 'rounded-xl bg-card px-4 py-3 text-[13px] leading-6 text-foreground hairline-ring ring-border',
	plain: '-mx-2 rounded-lg px-2 py-1 text-sm leading-6 text-foreground transition-colors hover:bg-foreground/[0.02]'
} as const;

export type EditableRichTextSurface = keyof typeof READ_SURFACES;

const LOADING_SURFACE = 'h-24 animate-pulse rounded-xl bg-foreground/[0.04]';

function prepareEditor() {
	void preloadRichEditor();
}

export interface EditableRichTextProps {
	/** The section's heading row content: a label, with its glyph when the surface uses one. */
	label: ReactNode;
	value: string | null | undefined;
	/** Without the right to edit, the text only reads. */
	canEdit?: boolean;
	/** The full record is still loading: the text that is there reads, editing waits. */
	isReady?: boolean;
	/** Mounted only while editing; it calls `close` once saved or cancelled. */
	renderEditor: (close: () => void) => ReactNode;
	surface?: EditableRichTextSurface;
	className?: string;
}

/**
 * A description that reads first, as sanitized HTML without loading the editor, and is edited in place with the
 * Edit button or a double click on the text. One behaviour for the task page, the task drawer and the project page.
 */
export function EditableRichText({
	label,
	value,
	canEdit = true,
	isReady = true,
	renderEditor,
	surface = 'card',
	className
}: Readonly<EditableRichTextProps>) {
	const t = useTranslations();
	const [isEditing, setIsEditing] = useState(false);
	const hasText = Boolean(value?.trim());
	const isEditable = canEdit && isReady;
	const isEditingOutOfReach = isEditing && !isEditable;
	if (isEditingOutOfReach) {
		setIsEditing(false);
	}
	const showsEditor = isEditing && isEditable;
	const showsLoading = !isReady && !hasText;
	const showsReader = !showsEditor && !showsLoading;
	const showsEditButton = canEdit && !showsEditor;

	const startEditing = () => {
		if (isEditable) {
			setIsEditing(true);
		}
	};

	const stopEditing = () => setIsEditing(false);

	let emptyState: ReactNode = <p className="text-[13px] text-muted-foreground">{t('richEditor.NO_DESCRIPTION')}</p>;
	if (canEdit) {
		emptyState = (
			<button
				type="button"
				className={EMPTY_EDITABLE}
				disabled={!isReady}
				onPointerEnter={prepareEditor}
				onFocus={prepareEditor}
				onClick={startEditing}
			>
				{t('richEditor.EMPTY_DESCRIPTION')}
			</button>
		);
	}

	let editHint: string | undefined;
	if (isEditable) {
		editHint = t('richEditor.EDIT_DESCRIPTION');
	}

	return (
		<section className={cn('flex flex-col gap-2', className)}>
			<div className="flex h-8 items-center gap-2.5">
				{label}
				{showsEditButton && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="ml-auto h-7 gap-1.5 text-muted-foreground"
						disabled={!isReady}
						onPointerEnter={prepareEditor}
						onFocus={prepareEditor}
						onClick={startEditing}
					>
						<Pencil className="size-3.5" aria-hidden="true" />
						{t('richEditor.EDIT')}
					</Button>
				)}
			</div>
			{showsLoading && <div role="status" className={LOADING_SURFACE} />}
			{showsEditor && (
				<div className="p-1 rounded-xl bg-card hairline-ring ring-foreground/20">
					{renderEditor(stopEditing)}
				</div>
			)}
			{showsReader && (
				<RichTextView
					value={value}
					emptyState={emptyState}
					title={editHint}
					onDoubleClick={startEditing}
					className={cn(READ_SURFACES[surface], isEditable && 'cursor-text')}
				/>
			)}
		</section>
	);
}
