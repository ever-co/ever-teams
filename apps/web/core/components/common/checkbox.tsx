'use client';

import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { Check } from '@/core/components/icons/hugeicons';

import { cn } from '@/core/lib/helpers';

type CheckedState = boolean | 'indeterminate';

interface CheckboxProps extends Omit<CheckboxPrimitive.Root.Props, 'checked' | 'defaultChecked'> {
	checked?: CheckedState;
	defaultChecked?: CheckedState;
}

function toBooleanChecked(state: CheckedState | undefined): boolean | undefined {
	if (state === 'indeterminate') {
		return false;
	}
	return state;
}

function resolveIndeterminate(
	checked: CheckedState | undefined,
	defaultChecked: CheckedState | undefined,
	indeterminate: boolean | undefined
): boolean {
	const isCheckedIndeterminate = checked === 'indeterminate';
	const isDefaultIndeterminate = defaultChecked === 'indeterminate';
	const isExplicitIndeterminate = indeterminate === true;
	return isCheckedIndeterminate || isDefaultIndeterminate || isExplicitIndeterminate;
}

const Checkbox = React.forwardRef<HTMLElement, CheckboxProps>(
	({ className, checked, defaultChecked, indeterminate, ...props }, ref) => (
		<CheckboxPrimitive.Root
			ref={ref}
			data-slot="checkbox"
			checked={toBooleanChecked(checked)}
			defaultChecked={toBooleanChecked(defaultChecked)}
			indeterminate={resolveIndeterminate(checked, defaultChecked, indeterminate)}
			className={cn(
				'peer relative inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] hairline-border border-transparent bg-background text-primary-foreground shadow-sm shadow-black/10 hairline-ring ring-foreground/10 outline-none transition-[color,box-shadow,background-color] dark:bg-foreground/5 dark:ring-foreground/15',
				'focus-visible:border-foreground/35 focus-visible:ring-[3px] focus-visible:ring-ring/25 dark:focus-visible:border-foreground/25',
				'data-checked:bg-primary data-checked:ring-(--ring-color) data-checked:[--ring-color:color-mix(in_oklab,black_15%,hsl(var(--primary)))] dark:data-checked:[--ring-color:color-mix(in_oklab,white_15%,hsl(var(--primary)))]',
				'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
				'disabled:cursor-not-allowed disabled:opacity-50 data-disabled:cursor-not-allowed data-disabled:opacity-50',
				className
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className="flex items-center justify-center text-current"
			>
				<Check className="size-3" strokeWidth={3} />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	)
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
