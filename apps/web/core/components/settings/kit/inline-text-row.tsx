'use client';

import { FormEvent, KeyboardEvent, ReactNode, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Input } from '@/core/components/common/input';
import { Spinner } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { SETTINGS_ROW, SETTINGS_ROW_DESCRIPTION, SETTINGS_ROW_LABEL } from './settings-page';

type InlineTextRowProps = {
	label: string;
	description?: ReactNode;
	value: string;
	emptyLabel?: string;
	placeholder?: string;
	type?: 'text' | 'email' | 'tel' | 'url';
	autoComplete?: string;
	maxLength?: number;
	validate?: (value: string) => string | null;
	onSave: (value: string) => Promise<unknown>;
	readOnly?: boolean;
	valueAdornment?: ReactNode;
	'data-testid'?: string;
};

function describedByOf(error: string | null, errorId: string) {
	if (!error) {
		return undefined;
	}
	return errorId;
}

export function InlineTextRow({
	label,
	description,
	value,
	emptyLabel,
	placeholder,
	type = 'text',
	autoComplete,
	maxLength,
	validate,
	onSave,
	readOnly = false,
	valueAdornment,
	...rest
}: Readonly<InlineTextRowProps>) {
	const t = useTranslations();
	const fieldId = useId();
	const errorId = `${fieldId}-error`;
	const [isEditing, setIsEditing] = useState(false);
	const [draft, setDraft] = useState(value);
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const trimmedDraft = draft.trim();
	const isUnchanged = trimmedDraft === value.trim();
	const hasValue = value.trim().length > 0;
	const canEdit = !readOnly;

	const startEditing = () => {
		setDraft(value);
		setError(null);
		setIsEditing(true);
	};

	const cancel = () => {
		setDraft(value);
		setError(null);
		setIsEditing(false);
	};

	const save = async (event?: FormEvent) => {
		event?.preventDefault();
		if (isSaving) {
			return;
		}
		if (isUnchanged) {
			setIsEditing(false);
			return;
		}
		const message = validate?.(trimmedDraft) ?? null;
		if (message) {
			setError(message);
			return;
		}
		setIsSaving(true);
		try {
			await onSave(trimmedDraft);
			setIsEditing(false);
		} catch {
			setError(t('settings.common.SAVE_FAILED'));
		} finally {
			setIsSaving(false);
		}
	};

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Escape') {
			return;
		}
		event.stopPropagation();
		cancel();
	};

	if (isEditing) {
		return (
			<form className={cn(SETTINGS_ROW, 'sm:items-start')} onSubmit={save} data-testid={rest['data-testid']}>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:pt-2">
					<label htmlFor={fieldId} className={SETTINGS_ROW_LABEL}>
						{label}
					</label>
					{description && <span className={SETTINGS_ROW_DESCRIPTION}>{description}</span>}
				</div>
				<div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-72">
					<Input
						id={fieldId}
						type={type}
						value={draft}
						autoFocus
						autoComplete={autoComplete}
						maxLength={maxLength}
						placeholder={placeholder}
						aria-invalid={Boolean(error) || undefined}
						aria-describedby={describedByOf(error, errorId)}
						onChange={(event) => {
							setDraft(event.target.value);
							setError(null);
						}}
						onKeyDown={onKeyDown}
						className="h-8"
					/>
					{error && (
						<p id={errorId} role="alert" className="text-xs text-destructive-ink">
							{error}
						</p>
					)}
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={isSaving}>
							{t('common.CANCEL')}
						</Button>
						<Button type="submit" size="sm" disabled={isSaving}>
							{isSaving && <Spinner className="size-3.5 animate-spin" />}
							{t('common.SAVE')}
						</Button>
					</div>
				</div>
			</form>
		);
	}

	return (
		<div className={SETTINGS_ROW} data-testid={rest['data-testid']}>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className={SETTINGS_ROW_LABEL}>{label}</span>
				{description && <span className={SETTINGS_ROW_DESCRIPTION}>{description}</span>}
			</div>
			<div className="flex min-w-0 items-center gap-3 sm:justify-end">
				{hasValue && <span className="min-w-0 truncate text-[13px] text-foreground">{value}</span>}
				{!hasValue && <span className="text-[13px] text-muted-foreground">{emptyLabel ?? '-'}</span>}
				{valueAdornment}
				{canEdit && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={startEditing}
						aria-label={t('settings.common.EDIT_FIELD', { field: label })}
					>
						{t('common.EDIT')}
					</Button>
				)}
			</div>
		</div>
	);
}
