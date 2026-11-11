'use client';

import {
	useWatch,
	type Control,
	type FieldValues,
	type Path,
	type PathValue,
	type UseFormSetValue
} from 'react-hook-form';
import type { TaskPropertySettingsKind } from '@/core/lib/utils/settings-task-properties';
import { PropertyIconPicker } from './pages/task-properties/property-icon-picker';

interface IconPopoverProps<TForm extends FieldValues> {
	/** The form whose `icon` field the picker shows. */
	control: Control<TForm>;
	setValue: UseFormSetValue<TForm>;
	kind: TaskPropertySettingsKind;
}

/**
 * The icon field of the task property forms (task bar, task details, edit status): the same picker as the settings
 * pages, bound to the form's `icon` field. It shows what the form holds, never a copy of its own: after a reset, an
 * edited property loading or a status type bringing its icon, the picker shows the icon the form will send.
 */
function IconPopover<TForm extends FieldValues>({ control, setValue, kind }: Readonly<IconPopoverProps<TForm>>) {
	const name = 'icon' as Path<TForm>;
	// Watched here, not in the form: a pick re-renders the picker only
	const icon: unknown = useWatch({ control, name });

	return (
		<PropertyIconPicker
			kind={kind}
			value={typeof icon === 'string' && icon ? icon : null}
			onChange={(picked) => setValue(name, picked as PathValue<TForm, Path<TForm>>)}
		/>
	);
}

export default IconPopover;
