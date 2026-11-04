// Adapted from prompt-kit (https://www.prompt-kit.com), MIT licence.
'use client';

import type { ButtonHTMLAttributes } from 'react';
import { useStickToBottomContext } from 'use-stick-to-bottom';
import { Button, type ButtonSize, type ButtonVariant } from '@/core/components/duplicated-components/_button';
import { ChevronDown } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';

export type ScrollButtonProps = {
	className?: string;
	variant?: ButtonVariant;
	size?: ButtonSize;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const hiddenRecipe = 'pointer-events-none translate-y-2 scale-95 opacity-0';

const visibleRecipe = 'pointer-events-auto translate-y-0 scale-100 opacity-100';

function tabIndexFor(isHidden: boolean) {
	if (isHidden) {
		return -1;
	}
	return 0;
}

function ScrollButton({ className, variant = 'outline', size = 'icon', ...props }: ScrollButtonProps) {
	const { isAtBottom, scrollToBottom } = useStickToBottomContext();
	const isHidden = isAtBottom;

	const handleClick = () => {
		void scrollToBottom();
	};

	return (
		<Button
			type="button"
			variant={variant}
			size={size}
			aria-hidden={isHidden}
			tabIndex={tabIndexFor(isHidden)}
			className={cn(
				'rounded-full shadow-md transition-[opacity,translate,scale] duration-150 ease-out',
				isHidden && hiddenRecipe,
				!isHidden && visibleRecipe,
				className
			)}
			onClick={handleClick}
			{...props}
		>
			<ChevronDown className="size-4" />
		</Button>
	);
}

export { ScrollButton };
