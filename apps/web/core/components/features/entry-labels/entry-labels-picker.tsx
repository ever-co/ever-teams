'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Checkbox } from '@/core/components/common/checkbox';
import { Input } from '@/core/components/common/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Button } from '@/core/components/duplicated-components/_button';
import { Plus, Tag } from '@/core/components/icons';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { useCreateTaskLabel } from '@/core/hooks/tasks/use-create-task-label';
import { useTaskLabelsQuery } from '@/core/hooks/tasks/use-task-labels-query';
import { cn } from '@/core/lib/helpers';
import { generateDefaultColor } from '@/core/lib/helpers/colors';
import { holdsAnyPermission } from '@/core/lib/utils/clients';
import { type EntryLabel, LABEL_CREATE_PERMISSIONS } from '@/core/lib/utils/time-log-labels';
import { EntryLabelChips } from './entry-label-chips';

interface EntryLabelsPickerProps {
	/** The ids of the labels picked. */
	value: string[];
	onChange: (labelIds: string[]) => void;
	/** The labels the entry carries as the API answered them: shown even once deleted from the team's list. */
	carriedLabels?: EntryLabel[];
	disabled?: boolean;
	/** Shown while a change is being saved. */
	isSaving?: boolean;
	/** `icon`: the timer's round button with a count; `field`: a form field that shows the chips. */
	variant?: 'icon' | 'field';
	className?: string;
}

interface PickableLabel extends EntryLabel {
	isDeleted: boolean;
}

interface TriggerProps {
	triggerLabel: string;
	isSaving: boolean;
	disabled: boolean;
	className?: string;
	picked: EntryLabel[];
}

/** The timer's round button: the tag glyph, and how many labels are picked. */
function IconTrigger({ triggerLabel, isSaving, disabled, className, picked, ...rest }: Readonly<TriggerProps>) {
	const hasPicked = picked.length > 0;
	return (
		<Button
			{...rest}
			type="button"
			variant="outline"
			size="icon-sm"
			aria-label={triggerLabel}
			aria-busy={isSaving}
			disabled={disabled}
			className={cn('relative rounded-full', className)}
		>
			<Tag aria-hidden="true" className="size-4" />
			{hasPicked && (
				<span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white dark:bg-primary-light">
					{picked.length}
				</span>
			)}
		</Button>
	);
}

/** A form field: the picked labels as chips, or the placeholder. */
function FieldTrigger({
	triggerLabel,
	isSaving,
	disabled,
	className,
	picked,
	placeholder,
	...rest
}: Readonly<TriggerProps & { placeholder: string }>) {
	return (
		<Button
			{...rest}
			type="button"
			variant="outline"
			aria-label={triggerLabel}
			aria-busy={isSaving}
			disabled={disabled}
			className={cn('h-auto min-h-9 w-full justify-start gap-2 px-3 py-1.5 font-normal', className)}
		>
			<Tag aria-hidden="true" className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
			<PickedOrPlaceholder picked={picked} placeholder={placeholder} />
		</Button>
	);
}

function PickedOrPlaceholder({ picked, placeholder }: Readonly<{ picked: EntryLabel[]; placeholder: string }>) {
	if (picked.length === 0) {
		return <span className="text-sm text-gray-500 dark:text-gray-400">{placeholder}</span>;
	}
	return <EntryLabelChips labels={picked} />;
}

function matchesQuery(label: EntryLabel, query: string) {
	if (!query) {
		return true;
	}
	return label.name.toLocaleLowerCase().includes(query.toLocaleLowerCase());
}

function hasLabelNamed(labels: ReadonlyArray<EntryLabel>, name: string) {
	const wanted = name.toLocaleLowerCase();
	return labels.some((label) => label.name.toLocaleLowerCase() === wanted);
}

/**
 * Picks the labels of a time entry among the team's labels, the list tasks use (Gauzy #12029). A label the entry
 * carries that the team list no longer holds stays listed, marked deleted, so it can be taken off. A role that may add
 * labels creates a missing one from the search, and it is picked at once.
 */
export function EntryLabelsPicker({
	value,
	onChange,
	carriedLabels = [],
	disabled = false,
	isSaving = false,
	variant = 'field',
	className
}: Readonly<EntryLabelsPickerProps>) {
	const t = useTranslations();
	const { taskLabels, loading: taskLabelsLoading } = useTaskLabelsQuery();
	const { createTaskLabels, createTaskLabelsLoading } = useCreateTaskLabel();
	const { myPermissions } = useMyRolePermissionsQuery();
	const canCreate = holdsAnyPermission(myPermissions, LABEL_CREATE_PERMISSIONS);
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState('');

	const labels = useMemo<PickableLabel[]>(() => {
		const byId = new Map<string, PickableLabel>();
		for (const label of taskLabels) {
			if (!label?.id) {
				continue;
			}
			byId.set(label.id, { id: label.id, name: label.name ?? '', color: label.color ?? null, isDeleted: false });
		}
		for (const carried of carriedLabels) {
			if (!byId.has(carried.id)) {
				byId.set(carried.id, { ...carried, isDeleted: true });
			}
		}
		return [...byId.values()].sort((first, second) =>
			first.name.localeCompare(second.name, undefined, { sensitivity: 'base' })
		);
	}, [carriedLabels, taskLabels]);

	const picked = useMemo(() => labels.filter((label) => value.includes(label.id)), [labels, value]);

	const toggle = useCallback(
		(labelId: string) => {
			const isPicked = value.includes(labelId);
			if (isPicked) {
				onChange(value.filter((id) => id !== labelId));
				return;
			}
			onChange([...value, labelId]);
		},
		[onChange, value]
	);

	const trimmedQuery = query.trim();
	const shownLabels = useMemo(
		() => labels.filter((label) => matchesQuery(label, trimmedQuery)),
		[labels, trimmedQuery]
	);
	const offersCreate = canCreate && trimmedQuery.length > 0 && !hasLabelNamed(labels, trimmedQuery);

	const create = useCallback(async () => {
		try {
			const response = await createTaskLabels({ name: trimmedQuery, color: generateDefaultColor(trimmedQuery) });
			const createdId = response?.data?.id;
			if (createdId) {
				onChange([...value, createdId]);
			}
			setQuery('');
		} catch {
			toast.error(t('timer.labels.CREATE_FAILED'));
		}
	}, [createTaskLabels, onChange, t, trimmedQuery, value]);

	const hasNoLabels = !taskLabelsLoading && labels.length === 0 && !offersCreate;
	const triggerLabel = t('timer.labels.LABELS');

	const triggerProps = { triggerLabel, isSaving, disabled, className, picked };
	let trigger = <FieldTrigger {...triggerProps} placeholder={t('timer.labels.PICK_LABELS')} />;
	if (variant === 'icon') {
		trigger = <IconTrigger {...triggerProps} />;
	}

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>{trigger}</PopoverTrigger>
			<PopoverContent align="start" sideOffset={6} collisionPadding={12} className="w-64 p-1">
				<Input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder={t('timer.labels.SEARCH')}
					aria-label={t('timer.labels.SEARCH')}
					className="mb-1 h-8 text-sm"
				/>
				{taskLabelsLoading && (
					<p className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">{t('common.LOADING')}</p>
				)}
				{hasNoLabels && (
					<p className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
						{t('timer.labels.NO_LABELS_YET')}
					</p>
				)}
				<ul className="max-h-64 overflow-y-auto" aria-label={triggerLabel}>
					{shownLabels.map((label) => {
						const isPicked = value.includes(label.id);
						return (
							<li key={label.id}>
								<label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-dark--theme-light">
									<Checkbox checked={isPicked} onCheckedChange={() => toggle(label.id)} />
									<span
										aria-hidden="true"
										className="size-2.5 shrink-0 rounded-full"
										style={{ backgroundColor: label.color ?? '#9ca3af' }}
									/>
									<span className="truncate">{label.name}</span>
									{label.isDeleted && (
										<span className="ml-auto shrink-0 text-xs text-gray-500 dark:text-gray-400">
											{t('timer.labels.DELETED')}
										</span>
									)}
								</label>
							</li>
						);
					})}
				</ul>
				{offersCreate && (
					<button
						type="button"
						onClick={create}
						disabled={createTaskLabelsLoading}
						aria-busy={createTaskLabelsLoading}
						className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-100 disabled:opacity-60 dark:hover:bg-dark--theme-light"
					>
						<Plus aria-hidden="true" className="size-4 shrink-0" />
						<span className="truncate">{t('timer.labels.CREATE', { name: trimmedQuery })}</span>
					</button>
				)}
			</PopoverContent>
		</Popover>
	);
}
