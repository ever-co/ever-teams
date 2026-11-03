'use client';

import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { Check, Minus } from '@/core/components/icons/hugeicons';

import { cn } from '@/core/lib/helpers';

type CheckedState = boolean | 'indeterminate';

interface CheckboxProps extends Omit<CheckboxPrimitive.Root.Props, 'checked'> {
	checked?: CheckedState;
}

function toBooleanChecked(state: CheckedState | undefined): boolean | undefined {
	if (state === 'indeterminate') {
		return false;
	}
	return state;
}

function resolveIndeterminate(checked: CheckedState | undefined, indeterminate: boolean | undefined): boolean {
	const isCheckedIndeterminate = checked === 'indeterminate';
	const isExplicitIndeterminate = indeterminate === true;
	return isCheckedIndeterminate || isExplicitIndeterminate;
}

function CheckboxMark({ isIndeterminate }: Readonly<{ isIndeterminate: boolean }>) {
	if (isIndeterminate) {
		return <Minus className="size-3" strokeWidth={3} />;
	}
	return <Check className="size-3" strokeWidth={3} />;
}

const Checkbox = React.forwardRef<HTMLElement, CheckboxProps>(
	({ className, checked, indeterminate, ...props }, ref) => {
		const isIndeterminate = resolveIndeterminate(checked, indeterminate);
		return (
			<CheckboxPrimitive.Root
				ref={ref}
				data-slot="checkbox"
				checked={toBooleanChecked(checked)}
				indeterminate={isIndeterminate}
				className={cn(
					'peer relative inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] hairline-border border-transparent bg-background text-primary-foreground shadow-sm shadow-black/10 hairline-ring ring-foreground/10 outline-none transition-[color,box-shadow,background-color] dark:bg-foreground/5 dark:ring-foreground/15',
					'focus-visible:border-foreground/35 focus-visible:ring-[3px] focus-visible:ring-ring/25 dark:focus-visible:border-foreground/25',
					'data-checked:bg-primary data-checked:ring-(--ring-color) data-checked:[--ring-color:color-mix(in_oklab,black_15%,hsl(var(--primary)))] dark:data-checked:[--ring-color:color-mix(in_oklab,white_15%,hsl(var(--primary)))]',
					'data-indeterminate:bg-primary data-indeterminate:ring-(--ring-color) data-indeterminate:[--ring-color:color-mix(in_oklab,black_15%,hsl(var(--primary)))] dark:data-indeterminate:[--ring-color:color-mix(in_oklab,white_15%,hsl(var(--primary)))]',
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
					<CheckboxMark isIndeterminate={isIndeterminate} />
				</CheckboxPrimitive.Indicator>
			</CheckboxPrimitive.Root>
		);
	}
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
