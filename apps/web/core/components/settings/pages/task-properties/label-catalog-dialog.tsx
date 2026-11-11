'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
	APP_DIALOG_BODY,
	APP_DIALOG_FOOTER,
	AppDialog,
	AppDialogDescription,
	AppDialogHeader
} from '@/core/components/common/app-dialog';
import { Checkbox } from '@/core/components/common/checkbox';
import { Input } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { Search, Spinner } from '@/core/components/icons';
import { dataColorDotStyle } from '@/core/components/tasks/task-data-color';
import type { CatalogAddOutcome } from '@/core/hooks/settings/use-add-catalog-labels';
import { cn } from '@/core/lib/helpers';
import {
	type CatalogGroup,
	type CatalogLabel,
	catalogGroupsOf,
	type LabelCategoryKey,
	labelNameKeyOf,
	labelNameKeysOf
} from '@/core/lib/utils/task-label-catalog';

const CATEGORY_KEYS = {
	type: 'settings.labelCatalog.categories.TYPE',
	priority: 'settings.labelCatalog.categories.PRIORITY',
	workflow: 'settings.labelCatalog.categories.WORKFLOW',
	area: 'settings.labelCatalog.categories.AREA',
	release: 'settings.labelCatalog.categories.RELEASE',
	feedback: 'settings.labelCatalog.categories.FEEDBACK',
	project: 'settings.labelCatalog.categories.PROJECT'
} as const satisfies Record<LabelCategoryKey, string>;

interface LabelCatalogDialogProps {
	open: boolean;
	/** The names of the team's labels: a catalog label of the same name shows as added. */
	existingNames: ReadonlyArray<string>;
	onClose: () => void;
	onAdd: (labels: ReadonlyArray<CatalogLabel>) => Promise<CatalogAddOutcome>;
}

function CategoryGroup({
	group,
	title,
	picked,
	isLocked,
	onToggle,
	onToggleAll
}: Readonly<{
	group: CatalogGroup;
	title: string;
	picked: ReadonlySet<string>;
	/** While the picks are being saved: what is sent cannot change any more. */
	isLocked: boolean;
	onToggle: (label: CatalogLabel) => void;
	onToggleAll: (labels: ReadonlyArray<CatalogLabel>, isPicking: boolean) => void;
}>) {
	const t = useTranslations();
	const pickable = group.entries.filter((entry) => !entry.isAdded).map((entry) => entry.label);
	const hasPickable = pickable.length > 0;
	const isAllPicked = hasPickable && pickable.every((item) => picked.has(labelNameKeyOf(item.name)));
	const toggleAllLabel = isAllPicked ? t('settings.labelCatalog.CLEAR') : t('settings.labelCatalog.SELECT_ALL');
	return (
		<fieldset className="flex min-w-0 flex-col gap-1.5" data-testid={`label-category-${group.key}`}>
			<legend className="mb-1.5 flex w-full items-center justify-between gap-3">
				<span className="text-xs font-medium text-muted-foreground">{title}</span>
				{hasPickable && (
					<button
						type="button"
						onClick={() => onToggleAll(pickable, !isAllPicked)}
						disabled={isLocked}
						aria-label={`${toggleAllLabel}: ${title}`}
						className="rounded-sm text-xs font-medium text-primary outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50"
					>
						{toggleAllLabel}
					</button>
				)}
			</legend>
			<ul className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
				{group.entries.map(({ label, isAdded }) => {
					const key = labelNameKeyOf(label.name);
					const isPicked = isAdded || picked.has(key);
					return (
						<li key={key}>
							<label
								className={cn(
									'flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-[13px] text-foreground transition-colors hover:bg-foreground/[0.04]',
									isAdded && 'cursor-default text-muted-foreground hover:bg-transparent'
								)}
							>
								<Checkbox
									checked={isPicked}
									disabled={isAdded || isLocked}
									onCheckedChange={() => onToggle(label)}
									aria-label={label.name}
								/>
								<span
									aria-hidden="true"
									className="size-2.5 shrink-0 rounded-full"
									style={dataColorDotStyle(label.color)}
								/>
								<span className="min-w-0 flex-1 truncate">{label.name}</span>
								{isAdded && (
									<span className="shrink-0 text-xs text-muted-foreground">
										{t('settings.labelCatalog.ADDED')}
									</span>
								)}
							</label>
						</li>
					);
				})}
			</ul>
		</fieldset>
	);
}

/**
 * Settings › Labels › Browse labels: the catalog of common labels by category, to add the ones the team needs in one
 * go. A label the team already has (same name, whatever its case or dashes) shows as added and cannot be picked; the
 * added labels are the team's own, to rename, recolour or remove like any other.
 */
export function LabelCatalogDialog({ open, existingNames, onClose, onAdd }: Readonly<LabelCatalogDialogProps>) {
	const t = useTranslations();
	const [query, setQuery] = useState('');
	const [picked, setPicked] = useState<ReadonlyMap<string, CatalogLabel>>(new Map());
	const [isAdding, setIsAdding] = useState(false);

	const existingKeys = useMemo(() => labelNameKeysOf(existingNames), [existingNames]);
	const groups = useMemo(
		() => catalogGroupsOf(query, existingKeys, (key) => t(CATEGORY_KEYS[key])),
		[existingKeys, query, t]
	);
	// A label the team added meanwhile (in another tab) leaves the selection
	const pickedLabels = [...picked.entries()].filter(([key]) => !existingKeys.has(key)).map(([, item]) => item);
	const pickedKeys = new Set(pickedLabels.map((item) => labelNameKeyOf(item.name)));
	const count = pickedLabels.length;

	const toggle = (item: CatalogLabel) => {
		const key = labelNameKeyOf(item.name);
		setPicked((current) => {
			const next = new Map(current);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.set(key, item);
			}
			return next;
		});
	};

	const toggleAll = (items: ReadonlyArray<CatalogLabel>, isPicking: boolean) => {
		setPicked((current) => {
			const next = new Map(current);
			for (const item of items) {
				const key = labelNameKeyOf(item.name);
				if (isPicking) {
					next.set(key, item);
				} else {
					next.delete(key);
				}
			}
			return next;
		});
	};

	const close = () => {
		if (isAdding) {
			return;
		}
		setQuery('');
		setPicked(new Map());
		onClose();
	};

	const add = async () => {
		if (count === 0 || isAdding) {
			return;
		}
		setIsAdding(true);
		try {
			const outcome = await onAdd(pickedLabels);
			if (outcome.added === 0) {
				// Nothing was filed (each label refused, or each request failed): the picks stay, to try again
				toast.error(t('settings.labelCatalog.FAILED_TOAST'));
				return;
			}
			if (outcome.failed > 0) {
				toast.warning(
					t('settings.labelCatalog.PARTIAL_TOAST', { added: outcome.added, failed: outcome.failed })
				);
			} else {
				toast.success(t('settings.labelCatalog.ADDED_TOAST', { count: outcome.added }));
			}
			setQuery('');
			setPicked(new Map());
			onClose();
		} catch {
			toast.error(t('settings.labelCatalog.FAILED_TOAST'));
		} finally {
			setIsAdding(false);
		}
	};

	return (
		<AppDialog open={open} onClose={close} width="lg" keepOpenOnOutsideClick>
			<AppDialogHeader title={t('settings.labelCatalog.TITLE')} onClose={close} />
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-5 pb-5')}>
				<div className="flex flex-col gap-3">
					<AppDialogDescription className="-mt-1 text-[13px] text-muted-foreground">
						{t('settings.labelCatalog.DESCRIPTION')}
					</AppDialogDescription>
					<div className="relative">
						<Search
							aria-hidden="true"
							className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							type="search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder={t('settings.labelCatalog.SEARCH')}
							aria-label={t('settings.labelCatalog.SEARCH')}
							className="pl-8"
							data-initial-focus=""
						/>
					</div>
				</div>
				{groups.length === 0 && (
					<p className="py-6 text-center text-sm text-muted-foreground">
						{t('settings.labelCatalog.NO_MATCH')}
					</p>
				)}
				{groups.map((group) => (
					<CategoryGroup
						key={group.key}
						group={group}
						title={t(CATEGORY_KEYS[group.key])}
						picked={pickedKeys}
						isLocked={isAdding}
						onToggle={toggle}
						onToggleAll={toggleAll}
					/>
				))}
			</div>
			<div className={APP_DIALOG_FOOTER}>
				<span className="mr-auto text-xs tabular-nums text-muted-foreground" aria-live="polite">
					{t('settings.labelCatalog.SELECTED', { count })}
				</span>
				<Button type="button" variant="ghost" onClick={close} disabled={isAdding}>
					{t('common.CANCEL')}
				</Button>
				<Button type="button" onClick={() => void add()} disabled={count === 0 || isAdding}>
					{isAdding && <Spinner className="size-4 animate-spin" />}
					{t('settings.labelCatalog.ADD', { count })}
				</Button>
			</div>
		</AppDialog>
	);
}
