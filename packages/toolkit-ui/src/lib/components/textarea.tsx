/** @jsxImportSource theme-ui */
import * as React from 'react';

import { cva, VariantProps } from 'class-variance-authority';
import { cn } from '../utils/utils';

export interface TextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
		VariantProps<typeof textareaVariants> {}

const textareaVariants = cva('px-3 py-2', {
	variants: {
		variant: {
			default: ' w-full ',
			error: ' text-input-error-foreground border border-red-500',
			success: 'bg-input-success text-input-success-foreground border border-green-500',
			warning: 'bg-input-warning text-input-warning-foreground border border-yellow-500'
		},
		textareaSize: {
			default: ' px-3',
			sm: ' rounded-md  text-xs',
			lg: 'h-11 rounded-md px-8',
			custom: 'h-10 px-3'
		}
	},
	defaultVariants: {
		variant: 'default',
		textareaSize: 'default'
	}
});

const Textarea = ({
	ref,
	className,
	variant,
	textareaSize,
	...props
}: TextareaProps & {
	ref?: React.RefObject<HTMLTextAreaElement>;
}) => {
	return (
		<textarea
			className={cn(
				textareaVariants({ variant, textareaSize, className }),
				'rounded-lg border  bg-transparent focus:outline-hidden outline-hidden text-sm px-3'
			)}
			ref={ref}
			{...props}
			sx={{ '&:focus': { borderColor: 'borderColor' } }}
		/>
	);
};
Textarea.displayName = 'Textarea';

export { Textarea };
