import { cn } from '@/core/lib/helpers';
import * as React from 'react';
import { controlRecipe } from '@/core/components/common/input';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
	({ className, type, ...props }, ref) => {
		return (
			<input
				type={type}
				data-slot="input"
				className={cn(
					controlRecipe,
					'flex h-9 px-3 py-2',
					type === 'search' &&
						'[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none',
					type === 'file' &&
						'p-0 pr-3 italic text-muted-foreground/70 file:me-3 file:h-full file:border-0 file:hairline-r file:border-solid file:border-input file:bg-transparent file:px-3 file:text-sm file:font-medium file:not-italic file:text-foreground',
					className
				)}
				ref={ref}
				{...props}
			/>
		);
	}
);
Input.displayName = 'Input';

export { Input };
