'use client';

import { Switch } from '@headlessui/react';
import { SWITCH_THUMB_RECIPE, SWITCH_TRACK_RECIPE } from '@/core/components/common/switch-recipes';
import { cn } from '@/core/lib/helpers';

const BILLABLE_TRACK_CLASS_NAME = cn(SWITCH_TRACK_RECIPE, 'h-5 w-8.5');

const BILLABLE_THUMB_CLASS_NAME = cn(SWITCH_THUMB_RECIPE, 'size-3.5 group-data-checked:translate-x-3.5');

/** The billable switch of a time entry form, named by its own label. */
export function BillableSwitch({
	isBillable,
	onChange,
	label
}: Readonly<{ isBillable: boolean; onChange: (isBillable: boolean) => void; label: string }>) {
	return (
		<label className="flex cursor-pointer items-center gap-2 text-[13px] text-foreground select-none">
			<Switch checked={isBillable} onChange={onChange} className={BILLABLE_TRACK_CLASS_NAME}>
				<span aria-hidden="true" className={BILLABLE_THUMB_CLASS_NAME} />
			</Switch>
			{label}
		</label>
	);
}
