'use client';

import { ChangeEvent, FormEvent, KeyboardEvent, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner } from '@/core/components/icons';
import {
	draftWithTemplate,
	groupOfTemplate,
	hasIconLibrary,
	isPropertyNameFilled,
	PropertyDraft,
	TaskPropertySettingsKind
} from '@/core/lib/utils/settings-task-properties';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { PropertyColorField } from './property-color-field';
import { PropertyIconPicker } from './property-icon-picker';
import { STATUS_GROUP_LABEL_KEYS } from './property-i18n';
import { PROPERTY_EDITOR_LABEL } from './property-list-recipes';
import { PropertyPreview } from './property-preview';
import { StatusTypePicker } from './status-type-picker';

export type PropertyEditorMode = 'create' | 'edit';

interface PropertyEditorRowProps {
	kind: TaskPropertySettingsKind;
	mode: PropertyEditorMode;
	initialDraft: PropertyDraft;
	showsGroupHint?: boolean;
	onCancel: () => void;
	onSave: (draft: PropertyDraft) => Promise<void>;
}

function describedByOf(error: string | null, errorId: string) {
	if (!error) {
		return undefined;
	}
	return errorId;
}

/** Escape cancels the row, unless it was pressed in one of its pickers, which close themselves first. */
function isEscapeInsideRow(event: KeyboardEvent<HTMLFormElement>) {
	const isEscape = event.key === 'Escape';
	const isInsideRow = event.currentTarget.contains(event.target as Node);
	return isEscape && isInsideRow;
}

export function PropertyEditorRow({
	kind,
	mode,
	initialDraft,
	showsGroupHint = false,
	onCancel,
	onSave
}: Readonly<PropertyEditorRowProps>) {
	const t = useTranslations();
	const nameId = useId();
	const errorId = `${nameId}-error`;
	const colorLabelId = `${nameId}-color`;
	const typeLabelId = `${nameId}-type`;
	const [draft, setDraft] = useState(initialDraft);
	const [isIconPicked, setIsIconPicked] = useState(mode === 'edit');
	const [nameError, setNameError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const hasLook = hasIconLibrary(kind);
	const isStatus = kind === 'status';
	const isCreating = mode === 'create';
	const hasTemplate = draft.template !== null;
	const showsTypeHint = showsGroupHint && isCreating && hasTemplate;
	const namePlaceholder = t('settings.taskProperties.NAME_PLACEHOLDER', { kind });
	const typeGroup = groupOfTemplate(draft.template);
	const typeGroupLabel = t(STATUS_GROUP_LABEL_KEYS[typeGroup]);

	let saveLabel = t('common.SAVE');
	if (isCreating) {
		saveLabel = t('settings.taskProperties.ADD', { kind });
	}

	const changeName = (event: ChangeEvent<HTMLInputElement>) => {
		const name = event.target.value;
		setDraft((current) => ({ ...current, name }));
		setNameError(null);
	};

	const changeColor = (color: string) => {
		setDraft((current) => ({ ...current, color }));
	};

	const changeIcon = (icon: string) => {
		setIsIconPicked(true);
		setDraft((current) => ({ ...current, icon }));
	};

	const changeTemplate = (template: ETaskStatusName | null) => {
		setDraft((current) => draftWithTemplate(current, template, isIconPicked));
	};

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isSaving) {
			return;
		}
		if (!isPropertyNameFilled(draft.name)) {
			setNameError(t('settings.taskProperties.NAME_REQUIRED'));
			return;
		}
		setIsSaving(true);
		try {
			await onSave(draft);
		} catch {
			// The mutation's error toast gives the reason; the row stays open with what was typed.
		} finally {
			setIsSaving(false);
		}
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
		if (!isEscapeInsideRow(event)) {
			return;
		}
		event.stopPropagation();
		onCancel();
	};

	return (
		<form
			onSubmit={submit}
			onKeyDown={handleKeyDown}
			className="flex flex-col gap-3 bg-foreground/[0.025] px-4 py-3"
		>
			<div className="flex items-start gap-2">
				{hasLook && <PropertyIconPicker kind={kind} value={draft.icon} onChange={changeIcon} />}
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<label htmlFor={nameId} className="sr-only">
						{t('common.NAME')}
					</label>
					<Input
						id={nameId}
						value={draft.name}
						autoFocus
						autoComplete="off"
						placeholder={namePlaceholder}
						onChange={changeName}
						aria-invalid={Boolean(nameError) || undefined}
						aria-describedby={describedByOf(nameError, errorId)}
						className="h-8"
					/>
					{nameError && (
						<p id={errorId} role="alert" className="text-xs text-destructive-ink">
							{nameError}
						</p>
					)}
				</div>
			</div>
			{hasLook && (
				<div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:items-center">
					<span id={colorLabelId} className={PROPERTY_EDITOR_LABEL}>
						{t('settings.taskProperties.COLOR')}
					</span>
					<PropertyColorField value={draft.color} onChange={changeColor} labelledBy={colorLabelId} />
					{isStatus && (
						<>
							<span id={typeLabelId} className={PROPERTY_EDITOR_LABEL}>
								{t('settings.taskProperties.TYPE')}
							</span>
							<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
								<StatusTypePicker
									value={draft.template}
									onChange={changeTemplate}
									labelledBy={typeLabelId}
								/>
								{showsTypeHint && (
									<span className="text-xs text-muted-foreground">
										{t('settings.taskProperties.TYPE_GROUP_HINT', { group: typeGroupLabel })}
									</span>
								)}
							</div>
						</>
					)}
				</div>
			)}
			<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
				{hasLook && (
					<div className="flex min-w-0 items-center gap-2">
						<span className={PROPERTY_EDITOR_LABEL}>{t('settings.taskProperties.PREVIEW')}</span>
						<PropertyPreview
							kind={kind}
							name={draft.name}
							color={draft.color}
							placeholder={namePlaceholder}
						/>
					</div>
				)}
				<div className="ml-auto flex items-center gap-2">
					<Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
						{t('common.CANCEL')}
					</Button>
					<Button type="submit" size="sm" disabled={isSaving}>
						{isSaving && <Spinner className="size-3.5 animate-spin" />}
						{saveLabel}
					</Button>
				</div>
			</div>
		</form>
	);
}
