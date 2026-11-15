'use client';

import { Switch } from '@headlessui/react';
import { SWITCH_THUMB_RECIPE, SWITCH_TRACK_RECIPE } from '@/core/components/common/switch-recipes';
import { cn } from '@/core/lib/helpers';

const BILLABLE_TRACK_CLASS_NAME = cn(SWITCH_TRACK_RECIPE, 'h-5 w-8.5');

const BILLABLE_THUMB_CLASS_NAME = cn(SWITCH_THUMB_RECIPE, 'size-3.5 group-data-checked:translate-x-3.5');

function SwitchLabelText({ label, isVisible }: Readonly<{ label: string; isVisible: boolean }>) {
	if (isVisible) {
		return <>{label}</>;
	}
	return <span className="sr-only">{label}</span>;
}

/** The billable switch of a time entry form, named by its own label. */
export function BillableSwitch({
	isBillable,
	onChange,
	label,
	isLabelVisible = true,
	isDisabled = false
}: Readonly<{
	isBillable: boolean;
	onChange: (isBillable: boolean) => void;
	label: string;
	isLabelVisible?: boolean;
	/** Holds the switch, for example while its last change is still being saved. */
	isDisabled?: boolean;
}>) {
	return (
		<label
			className={cn(
				'flex items-center gap-2 text-[13px] text-foreground select-none',
				isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
			)}
		>
			<Switch
				checked={isBillable}
				onChange={onChange}
				disabled={isDisabled}
				className={BILLABLE_TRACK_CLASS_NAME}
			>
				<span aria-hidden="true" className={BILLABLE_THUMB_CLASS_NAME} />
			</Switch>
			<SwitchLabelText label={label} isVisible={isLabelVisible} />
		</label>
	);
}
