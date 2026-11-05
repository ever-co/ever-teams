'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronDown } from '@/core/components/icons';
import { TaskPropertyIcon, TaskPropertyPlaceholderIcon } from '@/core/components/tasks/task-property-icon';
import { STATUS_TEMPLATES } from '@/core/lib/utils/settings-task-properties';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { statusTypeLabelKeyOf } from './property-i18n';

interface StatusTypePickerProps {
	value: ETaskStatusName | null;
	onChange: (template: ETaskStatusName | null) => void;
	labelledBy: string;
}

export function StatusTypePicker({ value, onChange, labelledBy }: Readonly<StatusTypePickerProps>) {
	const t = useTranslations();
	const triggerId = useId();
	const isUnset = value === null;

	let currentLabel = t('settings.taskProperties.TYPE_NONE');
	if (value) {
		const labelKey = statusTypeLabelKeyOf(value);
		currentLabel = t(labelKey);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					id={triggerId}
					type="button"
					variant="outline"
					size="sm"
					aria-labelledby={`${labelledBy} ${triggerId}`}
					className="gap-1.5"
				>
					{value && <TaskPropertyIcon kind="status" name={value} />}
					{isUnset && <TaskPropertyPlaceholderIcon kind="status" />}
					<span>{currentLabel}</span>
					<ChevronDown className="size-3.5 text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-56">
				<DropdownMenuItem onClick={() => onChange(null)}>
					<TaskPropertyPlaceholderIcon kind="status" />
					{t('settings.taskProperties.TYPE_NONE')}
					{isUnset && <SelectedMark className="ml-auto" />}
				</DropdownMenuItem>
				{STATUS_TEMPLATES.map((template) => {
					const isCurrent = template === value;
					const labelKey = statusTypeLabelKeyOf(template);
					return (
						<DropdownMenuItem key={template} onClick={() => onChange(template)}>
							<TaskPropertyIcon kind="status" name={template} />
							{t(labelKey)}
							{isCurrent && <SelectedMark className="ml-auto" />}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
