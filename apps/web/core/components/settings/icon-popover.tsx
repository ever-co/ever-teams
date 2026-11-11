'use client';

import { useState } from 'react';
import type { FieldValues, UseFormSetValue } from 'react-hook-form';
import type { TaskPropertySettingsKind } from '@/core/lib/utils/settings-task-properties';
import { PropertyIconPicker } from './pages/task-properties/property-icon-picker';

interface IconPopoverProps {
	setValue: UseFormSetValue<FieldValues>;
	kind: TaskPropertySettingsKind;
	/** The icon the form starts from: the edited property's, or the one its status type brings. */
	value?: string | null;
}

/**
 * The icon field of the task property forms (task bar, task details, edit status): the same picker as the settings
 * pages, writing the chosen icon into the form's `icon` field.
 */
const IconPopover = ({ setValue, kind, value = null }: IconPopoverProps) => {
	const [picked, setPicked] = useState<string | null>(value);
	const [startValue, setStartValue] = useState<string | null>(value);

	// Another property, or another status type, brings its own icon
	if (value !== startValue) {
		setStartValue(value);
		setPicked(value);
	}

	const pick = (icon: string) => {
		setPicked(icon);
		setValue('icon', icon);
	};

	return <PropertyIconPicker kind={kind} value={picked} onChange={pick} />;
};

export default IconPopover;
