'use client';

import { ReactNode, useCallback, useEffect, useEffectEvent, useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { ResizingPanel } from '@/core/components/common/resizing-panel';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Plus } from '@/core/components/icons';
import { TaskPropertyIcon, TaskPropertyPlaceholderIcon } from '@/core/components/tasks/task-property-icon';
import { useTaskSettingsAccess } from '@/core/hooks/tasks/use-task-settings-access';
import { cn } from '@/core/lib/helpers';
import {
	defaultSwatchFor,
	draftOfItem,
	dropIndexOf,
	hasIconLibrary,
	iconPathOfTemplate,
	idsAfterMove,
	itemsOfGroup,
	PropertyDraft,
	PropertyListItem,
	STATUS_GROUP_GLYPH,
	STATUS_GROUP_ORDER,
	StatusGroupId,
	TaskPropertySettingsKind,
	TaskPropertySettingsModel,
	templateOfGroup
} from '@/core/lib/utils/settings-task-properties';
import { isPropertyRowData, isSameRowGroup, rowDropEdgeOf } from './property-dnd';
import { PropertyDeleteDialog } from './property-delete-dialog';
import { PropertyEditorRow } from './property-editor-row';
import { STATUS_GROUP_LABEL_KEYS } from './property-i18n';
import { PROPERTY_COUNT_CHIP, PROPERTY_GROUP_HEADER, PROPERTY_ROW, PROPERTY_SURFACE } from './property-list-recipes';
import { PropertyListSkeleton } from './property-list-skeleton';
import { PropertyRow, PropertyRowActions } from './property-row';

export type PropertyGroupKey = StatusGroupId | 'all';

const ALL = 'all' as const;

/** Labels are tags under their own permission; the other kinds follow the task settings rule the API enforces. */
function followsTaskSettingsRule(kind: TaskPropertySettingsKind) {
	return kind !== 'label';
}

export type PropertyEditorTarget = { mode: 'create'; groupKey: PropertyGroupKey } | { mode: 'edit'; itemId: string };

export function usePropertyListController() {
	const [editor, setEditor] = useState<PropertyEditorTarget | null>(null);
	const [pendingDelete, setPendingDelete] = useState<PropertyListItem | null>(null);

	const openCreate = useCallback((groupKey: PropertyGroupKey = ALL) => {
		setEditor({ mode: 'create', groupKey });
	}, []);
	const openEdit = useCallback((item: PropertyListItem) => {
		setEditor({ mode: 'edit', itemId: item.id });
	}, []);
	const closeEditor = useCallback(() => setEditor(null), []);
	const requestDelete = useCallback((item: PropertyListItem) => setPendingDelete(item), []);
	const closeDelete = useCallback(() => setPendingDelete(null), []);

	return { editor, openCreate, openEdit, closeEditor, pendingDelete, requestDelete, closeDelete };
}

export type PropertyListController = ReturnType<typeof usePropertyListController>;

export interface PropertyDeleteRenderProps {
	item: PropertyListItem;
	open: boolean;
	onClose: () => void;
	onDeleted: (item: PropertyListItem) => void;
}

interface PropertyListProps {
	kind: TaskPropertySettingsKind;
	model: Omit<TaskPropertySettingsModel, 'remove'>;
	controller: PropertyListController;
	skeletonRows: number;
	isGrouped?: boolean;
	onMove?: (orderedIds: string[]) => Promise<void>;
	onMakeDefault?: (item: PropertyListItem) => Promise<void>;
	onDelete?: (item: PropertyListItem) => Promise<unknown>;
	renderDeleteDialog?: (props: PropertyDeleteRenderProps) => ReactNode;
}

interface DisplayGroup {
	key: PropertyGroupKey;
	items: PropertyListItem[];
}

function displayGroupsOf(items: PropertyListItem[], isGrouped: boolean): DisplayGroup[] {
	if (!isGrouped) {
		return [{ key: ALL, items }];
	}
	const groups = STATUS_GROUP_ORDER.map((groupId) => ({ key: groupId, items: itemsOfGroup(items, groupId) }));
	return groups.filter((group) => {
		const isOther = group.key === 'other';
		const isEmpty = group.items.length === 0;
		return !(isOther && isEmpty);
	});
}

function statusGroupOfKey(groupKey: PropertyGroupKey): StatusGroupId | null {
	if (groupKey === ALL) {
		return null;
	}
	return groupKey;
}

function newDraftOf(kind: TaskPropertySettingsKind, groupKey: PropertyGroupKey, itemCount: number): PropertyDraft {
	if (!hasIconLibrary(kind)) {
		return { name: '', color: null, icon: null, template: null };
	}
	const template = templateOfGroup(statusGroupOfKey(groupKey));
	const icon = iconPathOfTemplate(template);
	return { name: '', color: defaultSwatchFor(itemCount), icon, template };
}

function createGroupKeyOf(editor: PropertyEditorTarget | null, groups: DisplayGroup[]): PropertyGroupKey | null {
	if (editor?.mode !== 'create') {
		return null;
	}
	const isShown = groups.some((group) => group.key === editor.groupKey);
	if (isShown) {
		return editor.groupKey;
	}
	return groups[0]?.key ?? null;
}

function focusLater(root: HTMLElement | null, selector: string) {
	requestAnimationFrame(() => {
		const target = root?.querySelector<HTMLElement>(selector);
		target?.focus();
	});
}

function AddRow({
	kind,
	groupKey,
	hasRowsAbove,
	onAdd,
	disabled
}: Readonly<{
	kind: TaskPropertySettingsKind;
	groupKey: PropertyGroupKey;
	hasRowsAbove: boolean;
	onAdd: () => void;
	disabled: boolean;
}>) {
	const t = useTranslations();
	return (
		<button
			type="button"
			data-add-row={groupKey}
			onClick={onAdd}
			disabled={disabled}
			className={cn(
				PROPERTY_ROW,
				'w-full cursor-pointer text-left text-[13px] text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.03] hover:text-foreground focus-visible:bg-foreground/[0.04] focus-visible:text-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4',
				hasRowsAbove && 'hairline-t border-dashed border-border'
			)}
		>
			<Plus aria-hidden="true" />
			{t('settings.taskProperties.ADD', { kind })}
		</button>
	);
}

const GHOST_ROW_WIDTHS = ['w-full', 'w-4/5', 'w-3/5'];

function EmptyState({
	kind,
	onAdd,
	disabled
}: Readonly<{ kind: TaskPropertySettingsKind; onAdd: () => void; disabled: boolean }>) {
	const t = useTranslations();
	return (
		<div className="flex flex-col items-center px-6 py-8 text-center">
			<div className="mb-4 flex w-52 flex-col gap-1.5" aria-hidden="true">
				{GHOST_ROW_WIDTHS.map((width) => (
					<span
						key={width}
						className="flex h-8 items-center gap-2.5 rounded-lg px-2.5 hairline-border border-dashed border-foreground/15"
					>
						<TaskPropertyPlaceholderIcon kind={kind} />
						<span className={cn('h-2 rounded-full bg-foreground/[0.06]', width)} />
					</span>
				))}
			</div>
			<p className="text-[13px] font-medium text-balance text-foreground">
				{t('settings.taskProperties.EMPTY_TITLE', { kind })}
			</p>
			<p className="mt-1 max-w-sm text-xs text-pretty text-muted-foreground">
				{t('settings.taskProperties.EMPTY_DESCRIPTION', { kind })}
			</p>
			<Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={disabled} className="mt-4">
				<Plus />
				{t('settings.taskProperties.ADD', { kind })}
			</Button>
		</div>
	);
}

function GroupHeader({
	groupId,
	count,
	onAdd,
	disabled
}: Readonly<{ groupId: StatusGroupId; count: number; onAdd: () => void; disabled: boolean }>) {
	const t = useTranslations();
	const groupLabel = t(STATUS_GROUP_LABEL_KEYS[groupId]);
	return (
		<div className={PROPERTY_GROUP_HEADER}>
			<TaskPropertyIcon kind="status" name={STATUS_GROUP_GLYPH[groupId]} />
			<h2 className="text-[13px] font-semibold text-foreground">{groupLabel}</h2>
			<span className={PROPERTY_COUNT_CHIP} aria-label={t('settings.taskProperties.GROUP_COUNT', { count })}>
				{count}
			</span>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				onClick={onAdd}
				disabled={disabled}
				aria-label={t('settings.taskProperties.GROUP_ADD', { group: groupLabel })}
				className="ml-auto text-muted-foreground"
			>
				<Plus />
			</Button>
		</div>
	);
}

export function PropertyList({
	kind,
	model,
	controller,
	skeletonRows,
	isGrouped = false,
	onMove,
	onMakeDefault,
	onDelete,
	renderDeleteDialog
}: Readonly<PropertyListProps>) {
	const t = useTranslations();
	const listId = useId();
	const rootRef = useRef<HTMLDivElement>(null);
	const [announcement, setAnnouncement] = useState('');
	const [shownDelete, setShownDelete] = useState<PropertyListItem | null>(null);
	const { items, isLoading, isError, retry, create, update } = model;
	const { editor, openCreate, openEdit, closeEditor, pendingDelete, requestDelete, closeDelete } = controller;
	const { canCreate: canCreateTaskSetting, canWriteRow, readOnlyHint } = useTaskSettingsAccess();
	const isAccessRuled = followsTaskSettingsRule(kind);
	const canCreate = !isAccessRuled || canCreateTaskSetting;
	const isCreateRefused = !canCreate;
	const canWriteItem = useCallback(
		(item: PropertyListItem) => {
			if (!isAccessRuled) {
				return true;
			}
			return canWriteRow(item);
		},
		[isAccessRuled, canWriteRow]
	);

	const groups = useMemo(() => displayGroupsOf(items, isGrouped), [items, isGrouped]);
	const hasItems = items.length > 0;
	const createGroupKey = createGroupKeyOf(editor, groups);
	const isCreating = createGroupKey !== null;
	const isDeleteOpen = pendingDelete !== null;

	const isNewDeleteRequest = pendingDelete !== null && pendingDelete !== shownDelete;
	if (isNewDeleteRequest) {
		setShownDelete(pendingDelete);
	}

	const moveTo = useCallback(
		async (groupKey: PropertyGroupKey, item: PropertyListItem, toIndex: number) => {
			if (!onMove) {
				return;
			}
			const orderedIds = groups.flatMap((group) => {
				const ids = group.items.map((groupItem) => groupItem.id);
				if (group.key !== groupKey) {
					return ids;
				}
				return idsAfterMove(ids, item.id, toIndex);
			});
			await onMove(orderedIds);
			setAnnouncement(t('settings.taskProperties.ANNOUNCE_MOVED', { name: item.label, position: toIndex + 1 }));
		},
		[groups, onMove, t]
	);

	const moveByOffset = useCallback(
		(item: PropertyListItem, offset: -1 | 1) => {
			const group = groups.find((candidate) => candidate.items.some((groupItem) => groupItem.id === item.id));
			if (!group) {
				return;
			}
			const index = group.items.findIndex((groupItem) => groupItem.id === item.id);
			void moveTo(group.key, item, index + offset);
		},
		[groups, moveTo]
	);

	const makeDefault = useCallback(
		async (item: PropertyListItem) => {
			if (!onMakeDefault) {
				return;
			}
			try {
				await onMakeDefault(item);
				setAnnouncement(t('settings.taskProperties.ANNOUNCE_DEFAULT', { name: item.label }));
			} catch {
				// The mutation's error toast gives the reason; the list still shows the stored default.
			}
		},
		[onMakeDefault, t]
	);

	let rowMove: PropertyRowActions['onMove'];
	if (onMove) {
		rowMove = moveByOffset;
	}
	let rowMakeDefault: PropertyRowActions['onMakeDefault'];
	if (onMakeDefault) {
		rowMakeDefault = makeDefault;
	}

	const dropRow = useEffectEvent(
		(source: Record<string | symbol, unknown>, target: Record<string | symbol, unknown>) => {
			if (!isPropertyRowData(source)) {
				return;
			}
			if (!isPropertyRowData(target)) {
				return;
			}
			if (!isSameRowGroup(source, target)) {
				return;
			}
			const toIndex = dropIndexOf(source.index, target.index, rowDropEdgeOf(target));
			if (toIndex === source.index) {
				return;
			}
			const group = groups.find((candidate) => candidate.key === source.groupKey);
			const item = group?.items.find((groupItem) => groupItem.id === source.itemId);
			if (!group || !item) {
				return;
			}
			void moveTo(group.key, item, toIndex);
		}
	);

	const canReorder = Boolean(onMove);
	useEffect(() => {
		if (!canReorder) {
			return;
		}
		return monitorForElements({
			canMonitor: ({ source }) => {
				if (!isPropertyRowData(source.data)) {
					return false;
				}
				return source.data.listId === listId;
			},
			onDrop: ({ source, location }) => {
				const target = location.current.dropTargets[0];
				if (!target) {
					return;
				}
				dropRow(source.data, target.data);
			}
		});
	}, [canReorder, listId]);

	const saveDraft = async (draft: PropertyDraft) => {
		if (!editor) {
			return;
		}
		const name = draft.name.trim();
		if (editor.mode === 'create') {
			if (isCreateRefused) {
				closeEditor();
				return;
			}
			await create(draft);
			setAnnouncement(t('settings.taskProperties.ANNOUNCE_ADDED', { name }));
			closeEditor();
			focusLater(rootRef.current, `[data-add-row="${createGroupKey}"]`);
			return;
		}
		const item = items.find((candidate) => candidate.id === editor.itemId);
		if (!item) {
			closeEditor();
			return;
		}
		const isEditRefused = !canWriteItem(item);
		if (isEditRefused) {
			closeEditor();
			return;
		}
		await update(item, draft);
		setAnnouncement(t('settings.taskProperties.ANNOUNCE_SAVED', { name }));
		closeEditor();
		focusLater(rootRef.current, `[data-property-row="${item.id}"] [data-row-menu]`);
	};

	const cancelEditor = () => {
		if (!editor) {
			return;
		}
		closeEditor();
		if (editor.mode === 'create') {
			focusLater(rootRef.current, `[data-add-row="${createGroupKey}"]`);
			return;
		}
		focusLater(rootRef.current, `[data-property-row="${editor.itemId}"] [data-row-menu]`);
	};

	const announceDeleted = useCallback(
		(item: PropertyListItem) => {
			setAnnouncement(t('settings.taskProperties.ANNOUNCE_DELETED', { name: item.label }));
		},
		[t]
	);

	const renderEditor = (mode: 'create' | 'edit', initialDraft: PropertyDraft) => (
		<PropertyEditorRow
			kind={kind}
			mode={mode}
			initialDraft={initialDraft}
			showsGroupHint={isGrouped}
			onCancel={cancelEditor}
			onSave={saveDraft}
		/>
	);

	const renderRows = (group: DisplayGroup) =>
		group.items.map((item, index) => {
			const isEdited = editor?.mode === 'edit' && editor.itemId === item.id;
			if (isEdited) {
				return <li key={item.id}>{renderEditor('edit', draftOfItem(item))}</li>;
			}
			const isRowReadOnly = !canWriteItem(item);
			let rowReadOnlyHint: string | undefined;
			if (isRowReadOnly) {
				rowReadOnlyHint = readOnlyHint;
			}
			return (
				<PropertyRow
					key={item.id}
					kind={kind}
					item={item}
					listId={listId}
					groupKey={group.key}
					index={index}
					isFirst={index === 0}
					isLast={index === group.items.length - 1}
					onEdit={openEdit}
					onDelete={requestDelete}
					onMove={rowMove}
					onMakeDefault={rowMakeDefault}
					readOnlyHint={rowReadOnlyHint}
				/>
			);
		});

	const renderGroupFoot = (group: DisplayGroup) => {
		const isCreatingHere = createGroupKey === group.key;
		const hasRows = group.items.length > 0;
		if (isCreatingHere) {
			return (
				<div className={cn(hasRows && 'hairline-t border-border')}>
					{renderEditor('create', newDraftOf(kind, group.key, items.length))}
				</div>
			);
		}
		return (
			<AddRow
				kind={kind}
				groupKey={group.key}
				hasRowsAbove={hasRows}
				onAdd={() => openCreate(group.key)}
				disabled={isCreateRefused}
			/>
		);
	};

	const renderDelete = () => {
		if (!shownDelete) {
			return null;
		}
		const deleteProps: PropertyDeleteRenderProps = {
			item: shownDelete,
			open: isDeleteOpen,
			onClose: closeDelete,
			onDeleted: announceDeleted
		};
		if (renderDeleteDialog) {
			return renderDeleteDialog(deleteProps);
		}
		if (!onDelete) {
			return null;
		}
		return <PropertyDeleteDialog kind={kind} onDelete={onDelete} {...deleteProps} />;
	};

	const showsError = isError && !hasItems;
	const showsSkeleton = isLoading && !hasItems;
	const showsEmpty = !hasItems && !isCreating;

	let content: ReactNode;
	if (showsError) {
		content = (
			<Notice
				tone="error"
				title={t('settings.taskProperties.ERROR_TITLE', { kind })}
				description={t('settings.taskProperties.ERROR_DESCRIPTION')}
				actions={
					<Button type="button" variant="outline" onClick={() => retry()}>
						{t('pages.unauthorized.TRY_AGAIN')}
					</Button>
				}
			/>
		);
	} else if (showsSkeleton) {
		content = <PropertyListSkeleton rows={skeletonRows} />;
	} else if (showsEmpty) {
		content = (
			<div className={PROPERTY_SURFACE}>
				<EmptyState kind={kind} onAdd={() => openCreate(ALL)} disabled={isCreateRefused} />
			</div>
		);
	} else {
		content = (
			<div className="flex flex-col gap-3">
				{groups.map((group) => (
					<div key={group.key} className={PROPERTY_SURFACE}>
						<ResizingPanel>
							{group.key !== ALL && (
								<GroupHeader
									groupId={group.key}
									count={group.items.length}
									onAdd={() => openCreate(group.key)}
									disabled={isCreateRefused}
								/>
							)}
							{group.items.length > 0 && (
								<ul className="hairline-divide-y divide-border">{renderRows(group)}</ul>
							)}
							{renderGroupFoot(group)}
						</ResizingPanel>
					</div>
				))}
			</div>
		);
	}

	return (
		<div ref={rootRef}>
			{isCreateRefused && <p className="mb-3 text-xs text-pretty text-muted-foreground">{readOnlyHint}</p>}
			{content}
			<p aria-live="polite" className="sr-only">
				{announcement}
			</p>
			{renderDelete()}
		</div>
	);
}
