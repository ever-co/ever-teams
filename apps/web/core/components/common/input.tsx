import * as React from 'react';

import { cn } from '@/core/lib/helpers';

/** The one field recipe: inputs, textareas, select triggers and native selects share it. */
const controlRecipe =
	'w-full min-w-0 rounded-md hairline-border border-transparent bg-background text-base text-foreground shadow-sm shadow-black/10 hairline-ring ring-foreground/10 outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground/75 md:text-sm dark:bg-foreground/5 dark:ring-foreground/15 focus-visible:border-foreground/35 focus-visible:ring-[3px] focus-visible:ring-ring/25 dark:focus-visible:border-foreground/25 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50';

/** The same recipe for a wrapper that holds an input plus leading or trailing nodes. */
const controlGroupRecipe =
	'flex w-full min-w-0 items-center rounded-md hairline-border border-transparent bg-background text-base text-foreground md:text-sm shadow-sm shadow-black/10 hairline-ring ring-foreground/10 transition-[color,box-shadow] dark:bg-foreground/5 dark:ring-foreground/15 focus-within:border-foreground/35 focus-within:ring-[3px] focus-within:ring-ring/25 dark:focus-within:border-foreground/25';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				controlRecipe,
				'flex h-9 px-2.5 py-1 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
				className
			)}
			ref={ref}
			{...props}
		/>
	);
});
Input.displayName = 'Input';

export { Input, controlRecipe, controlGroupRecipe };
