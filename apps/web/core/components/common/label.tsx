'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/core/lib/helpers';

const labelVariants = cva('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70');

type LabelProps = React.ComponentPropsWithoutRef<'label'> & VariantProps<typeof labelVariants>;

const FORM_CONTROL_SELECTOR = 'button, input, select, textarea';

/** A double click on the text of a label selects it; the form control inside the label keeps its own behaviour. */
function preventTextSelectionOnRepeatedClick(event: React.MouseEvent<HTMLLabelElement>) {
	const target = event.target as HTMLElement;
	const isInsideFormControl = target.closest(FORM_CONTROL_SELECTOR) !== null;
	if (isInsideFormControl) {
		return;
	}
	const isRepeatedClick = event.detail > 1;
	const shouldPrevent = !event.defaultPrevented && isRepeatedClick;
	if (shouldPrevent) {
		event.preventDefault();
	}
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, htmlFor, onMouseDown, ...props }, ref) => {
	const handleMouseDown = (event: React.MouseEvent<HTMLLabelElement>) => {
		onMouseDown?.(event);
		preventTextSelectionOnRepeatedClick(event);
	};
	return (
		<label
			ref={ref}
			data-slot="label"
			htmlFor={htmlFor}
			className={cn(labelVariants(), className)}
			onMouseDown={handleMouseDown}
			{...props}
		/>
	);
});
Label.displayName = 'Label';

export { Label };
