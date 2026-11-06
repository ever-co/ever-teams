'use client';

import type { ReactNode } from 'react';
import { Switch } from '@headlessui/react';
import { SWITCH_THUMB_RECIPE, SWITCH_TRACK_RECIPE } from '@/core/components/common/switch';
import { cn } from '@/core/lib/helpers';

/** One line of a list's Display popover: the muted name on the left, its control on the right. */
export function DisplayRow({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
	return (
		<div className="flex h-9 items-center justify-between gap-3 px-3">
			<span className="text-[13px] text-muted-foreground">{label}</span>
			{children}
		</div>
	);
}

/** A Display line that turns an option on or off. */
export function DisplaySwitchRow({
	label,
	isOn,
	onChange
}: Readonly<{ label: string; isOn: boolean; onChange: (isOn: boolean) => void }>) {
	return (
		<DisplayRow label={label}>
			<Switch
				checked={isOn}
				onChange={onChange}
				aria-label={label}
				className={cn(SWITCH_TRACK_RECIPE, 'h-5 w-8.5')}
			>
				<span className={cn(SWITCH_THUMB_RECIPE, 'size-3.5 group-data-checked:translate-x-3.5')} />
			</Switch>
		</DisplayRow>
	);
}

/** A property chip of the Display popover: filled while the property shows on the rows. */
export function PropertyToggle({
	label,
	isOn,
	onToggle
}: Readonly<{ label: string; isOn: boolean; onToggle: () => void }>) {
	return (
		<button
			type="button"
			aria-pressed={isOn}
			onClick={onToggle}
			className={cn(
				'inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25',
				isOn && 'bg-foreground/[0.07] text-foreground hairline-ring ring-foreground/10',
				!isOn && 'text-muted-foreground hairline-ring ring-foreground/10 hover:text-foreground'
			)}
		>
			{label}
		</button>
	);
}
