'use client';

import { useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { ConfirmDestructiveDialog, DangerConsequence } from '@/core/components/settings/kit/danger';
import { Layers, Tag, Task } from '@/core/components/icons';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { PropertyListItem, TaskPropertySettingsKind } from '@/core/lib/utils/settings-task-properties';

export interface PropertyDeleteDialogProps {
	kind: TaskPropertySettingsKind;
	item: PropertyListItem;
	open: boolean;
	onClose: () => void;
	onDeleted: (item: PropertyListItem) => void;
}

interface PropertyDeleteConfirmProps extends PropertyDeleteDialogProps {
	onConfirm: () => Promise<unknown>;
	consequences: DangerConsequence[];
	isReady?: boolean;
}

export function usePropertyDeleteConsequences(kind: TaskPropertySettingsKind): DangerConsequence[] {
	const t = useTranslations();
	const choices: DangerConsequence = {
		key: 'choices',
		icon: <Layers />,
		text: t('settings.taskProperties.delete.CHOICES_GONE')
	};
	if (kind === 'label') {
		return [choices, { key: 'tasks', icon: <Tag />, text: t('settings.taskProperties.delete.LABEL_REMOVED') }];
	}
	return [choices, { key: 'tasks', icon: <Task />, text: t('settings.taskProperties.delete.TASKS_KEEP_VALUE') }];
}

function PropertySubject({ kind, item }: Readonly<{ kind: TaskPropertySettingsKind; item: PropertyListItem }>) {
	const isFreeText = kind === 'label' || kind === 'version';
	return (
		<div className="flex items-center gap-2.5 rounded-lg px-3 py-2 hairline-ring ring-border">
			<TaskPropertyIcon kind={kind} name={item.name} color={item.color} icon={item.icon} />
			<span
				className={cn('min-w-0 truncate text-[13px] font-medium text-foreground', !isFreeText && 'capitalize')}
			>
				{item.label}
			</span>
		</div>
	);
}

export function PropertyDeleteConfirm({
	kind,
	item,
	open,
	onClose,
	onDeleted,
	onConfirm,
	consequences,
	isReady = true
}: Readonly<PropertyDeleteConfirmProps>) {
	const t = useTranslations();
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const close = () => {
		setError(null);
		onClose();
	};

	const confirm = async () => {
		setIsPending(true);
		setError(null);
		try {
			await onConfirm();
			onDeleted(item);
			onClose();
		} catch (failure) {
			const reasonKey = errorReasonKeyOf(failure) as DottedLanguageObjectStringPaths;
			setError(t(reasonKey));
		} finally {
			setIsPending(false);
		}
	};

	const isBusy = isPending || !isReady;

	return (
		<ConfirmDestructiveDialog
			open={open}
			onClose={close}
			title={t('settings.taskProperties.delete.TITLE', { kind })}
			description={t('settings.taskProperties.delete.DESCRIPTION')}
			subject={<PropertySubject kind={kind} item={item} />}
			consequences={consequences}
			confirmLabel={t('settings.taskProperties.delete.CONFIRM', { kind })}
			isPending={isBusy}
			error={error}
			onConfirm={confirm}
		/>
	);
}

interface PropertyDeleteDialogWithActionProps extends PropertyDeleteDialogProps {
	onDelete: (item: PropertyListItem) => Promise<unknown>;
}

export function PropertyDeleteDialog({ onDelete, ...props }: Readonly<PropertyDeleteDialogWithActionProps>) {
	const consequences = usePropertyDeleteConsequences(props.kind);
	return <PropertyDeleteConfirm {...props} consequences={consequences} onConfirm={() => onDelete(props.item)} />;
}
