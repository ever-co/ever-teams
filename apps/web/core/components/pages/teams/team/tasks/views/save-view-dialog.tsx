'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/core/components/common/dialog';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { Button } from '@/core/components/duplicated-components/_button';
import { Input } from '@/core/components/common/input';
import { ETaskViewVisibility } from '@/core/types/interfaces/common/task-views';

export type SaveViewMode = 'create' | 'rename';

interface SaveViewDialogProps {
	open: boolean;
	mode: SaveViewMode;
	initialName: string;
	initialVisibility: ETaskViewVisibility;
	onSubmit: (name: string, visibility: ETaskViewVisibility) => Promise<void> | void;
	onClose: () => void;
}

/** Names a view (and, when created, says who sees it: only me, or the team). */
export function SaveViewDialog({ open, mode, initialName, initialVisibility, onSubmit, onClose }: Readonly<SaveViewDialogProps>) {
	const t = useTranslations();
	const [name, setName] = useState(initialName);
	const [visibility, setVisibility] = useState<ETaskViewVisibility>(initialVisibility);
	const [isBusy, setIsBusy] = useState(false);

	useEffect(() => {
		if (open) {
			setName(initialName);
			setVisibility(initialVisibility);
		}
	}, [initialName, initialVisibility, open]);

	const items = useMemo<SegmentedControlItem<ETaskViewVisibility>[]>(
		() => [
			{ value: ETaskViewVisibility.PERSONAL, label: t('taskViews.PERSONAL') },
			{ value: ETaskViewVisibility.SHARED, label: t('taskViews.SHARED') }
		],
		[t]
	);

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		const trimmed = name.trim();
		if (!trimmed || isBusy) return;
		setIsBusy(true);
		try {
			await onSubmit(trimmed, visibility);
			onClose();
		} finally {
			setIsBusy(false);
		}
	};

	const isCreate = mode === 'create';
	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="sm:max-w-md">
				<form onSubmit={submit} className="flex flex-col gap-4">
					<DialogHeader>
						<DialogTitle>{isCreate ? t('taskViews.SAVE_VIEW') : t('taskViews.RENAME')}</DialogTitle>
						<DialogDescription>{isCreate ? t('taskViews.SAVE_VIEW_TEXT') : t('taskViews.RENAME_TEXT')}</DialogDescription>
					</DialogHeader>
					<Input
						value={name}
						onChange={(event) => setName(event.target.value)}
						autoFocus
						aria-label={t('taskViews.NAME')}
						placeholder={t('taskViews.NAME_PLACEHOLDER')}
						maxLength={80}
					/>
					{isCreate && (
						<div className="flex flex-col gap-2">
							<SegmentedControl items={items} value={visibility} onValueChange={setVisibility} ariaLabel={t('taskViews.VISIBILITY')} />
							<p className="text-xs text-muted-foreground">
								{visibility === ETaskViewVisibility.SHARED ? t('taskViews.VISIBILITY_SHARED_TEXT') : t('taskViews.VISIBILITY_PERSONAL_TEXT')}
							</p>
						</div>
					)}
					<DialogFooter>
						<Button type="button" variant="ghost" onClick={onClose}>
							{t('taskViews.CANCEL')}
						</Button>
						<Button type="submit" disabled={!name.trim() || isBusy}>
							{isCreate ? t('taskViews.CREATE') : t('taskViews.SAVE')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
