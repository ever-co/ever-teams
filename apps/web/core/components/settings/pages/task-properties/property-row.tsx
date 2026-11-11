'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronDown, ChevronUp, DragHandle, MoreHorizontal, Pencil, Star, Trash } from '@/core/components/icons';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { cn } from '@/core/lib/helpers';
import {
	isDeletionRefused,
	PropertyListItem,
	TaskPropertySettingsKind
} from '@/core/lib/utils/settings-task-properties';
import { dropEdgeOfState, propertyRowData, usePropertyRowDrag } from './property-dnd';
import { PROPERTY_DEFAULT_CHIP, PROPERTY_ROW, PROPERTY_ROW_LABEL } from './property-list-recipes';

/** These kinds are stored as slugs (`in-progress`); labels and versions are free text and keep their case. */
const KINDS_IN_TITLE_CASE: ReadonlySet<TaskPropertySettingsKind> = new Set(['status', 'priority', 'size', 'issueType']);

const HOVER_REVEAL =
	'pointer-fine:opacity-0 pointer-fine:group-hover/row:opacity-100 pointer-fine:group-focus-within/row:opacity-100 pointer-fine:aria-expanded:opacity-100';

const DROP_LINE = {
	top: '-top-px',
	bottom: '-bottom-px'
} as const;

export interface PropertyRowActions {
	onEdit: (item: PropertyListItem) => void;
	onDelete: (item: PropertyListItem) => void;
	onMove?: (item: PropertyListItem, offset: -1 | 1) => void;
	onMakeDefault?: (item: PropertyListItem) => void;
}

interface PropertyRowProps extends PropertyRowActions {
	kind: TaskPropertySettingsKind;
	item: PropertyListItem;
	listId: string;
	groupKey: string;
	index: number;
	isFirst: boolean;
	isLast: boolean;
	/** Shown when the user may not change this row: the actions stay listed, disabled under the hint. */
	readOnlyHint?: string;
}

function RowMenu({
	kind,
	item,
	isFirst,
	isLast,
	onEdit,
	onDelete,
	onMove,
	onMakeDefault,
	readOnlyHint
}: Readonly<Omit<PropertyRowProps, 'listId' | 'groupKey' | 'index'>>) {
	const t = useTranslations();
	const canReorder = Boolean(onMove);
	const offersMakeDefault = Boolean(onMakeDefault) && !item.isDefault;
	const isDeleteRefused = isDeletionRefused(kind, item);
	const isReadOnly = Boolean(readOnlyHint);
	const isMoveUpDisabled = isReadOnly || isFirst;
	const isMoveDownDisabled = isReadOnly || isLast;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					data-row-menu=""
					aria-label={t('settings.taskProperties.ROW_ACTIONS', { name: item.label })}
					className={cn('text-muted-foreground', HOVER_REVEAL)}
				>
					<MoreHorizontal />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				{isReadOnly && (
					<>
						<DropdownMenuLabel className="font-normal text-pretty">{readOnlyHint}</DropdownMenuLabel>
						<DropdownMenuSeparator />
					</>
				)}
				<DropdownMenuItem disabled={isReadOnly} onClick={() => onEdit(item)}>
					<Pencil />
					{t('common.EDIT')}
				</DropdownMenuItem>
				{offersMakeDefault && (
					<DropdownMenuItem disabled={isReadOnly} onClick={() => onMakeDefault?.(item)}>
						<Star />
						{t('settings.taskProperties.MAKE_DEFAULT')}
					</DropdownMenuItem>
				)}
				{canReorder && (
					<>
						<DropdownMenuItem disabled={isMoveUpDisabled} onClick={() => onMove?.(item, -1)}>
							<ChevronUp />
							{t('settings.taskProperties.MOVE_UP')}
						</DropdownMenuItem>
						<DropdownMenuItem disabled={isMoveDownDisabled} onClick={() => onMove?.(item, 1)}>
							<ChevronDown />
							{t('settings.taskProperties.MOVE_DOWN')}
						</DropdownMenuItem>
					</>
				)}
				<DropdownMenuSeparator />
				{isDeleteRefused && (
					<DropdownMenuLabel className="font-normal">
						{t('settings.taskProperties.BUILT_IN_DELETE')}
					</DropdownMenuLabel>
				)}
				{!isDeleteRefused && (
					<DropdownMenuItem variant="destructive" disabled={isReadOnly} onClick={() => onDelete(item)}>
						<Trash />
						{t('common.DELETE')}
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export const PropertyRow = memo(function PropertyRow(props: Readonly<PropertyRowProps>) {
	const t = useTranslations();
	const { kind, item, listId, groupKey, index } = props;
	const isReadOnly = Boolean(props.readOnlyHint);
	const hasMove = Boolean(props.onMove);
	const canReorder = hasMove && !isReadOnly;
	const dragData = propertyRowData(listId, groupKey, item.id, index);
	const { rowRef, handleRef, dragState } = usePropertyRowDrag(dragData, canReorder);
	const isDragging = dragState.type === 'dragging';
	const dropEdge = dropEdgeOfState(dragState);
	const isTitleCase = KINDS_IN_TITLE_CASE.has(kind);

	return (
		<li
			ref={rowRef}
			data-property-row={item.id}
			className={cn(PROPERTY_ROW, 'group/row', isDragging && 'opacity-40')}
		>
			{canReorder && (
				<span
					ref={handleRef}
					aria-hidden="true"
					title={t('settings.taskProperties.DRAG')}
					className={cn(
						'absolute top-1/2 left-0.5 hidden -translate-y-1/2 cursor-grab text-muted-foreground/70 active:cursor-grabbing pointer-fine:flex [&_svg]:size-3.5',
						HOVER_REVEAL
					)}
				>
					<DragHandle />
				</span>
			)}
			<TaskPropertyIcon kind={kind} name={item.name} color={item.color} icon={item.icon} />
			<span className={cn(PROPERTY_ROW_LABEL, isTitleCase && 'capitalize')}>{item.label}</span>
			{item.isDefault && <span className={PROPERTY_DEFAULT_CHIP}>{t('settings.taskProperties.DEFAULT')}</span>}
			<div className="ml-auto flex shrink-0 items-center">
				<RowMenu {...props} />
			</div>
			{dropEdge && (
				<span
					aria-hidden="true"
					className={cn(
						'pointer-events-none absolute inset-x-2 h-0.5 rounded-full bg-primary',
						DROP_LINE[dropEdge]
					)}
				/>
			)}
		</li>
	);
});
