'use client';
import { forwardRef } from 'react';

import { cn } from '@/core/lib/helpers';
import { Footer } from '.';

interface GlobalFooterProps {
	footerClassName?: string;
	isFixed?: boolean;
}

/** The page footer at the end of the content scroller; PageContentScroller pins it when asked to. */
const GlobalFooter = forwardRef<HTMLDivElement, GlobalFooterProps>(function GlobalFooter(
	{ footerClassName, isFixed = false },
	ref
) {
	return (
		<div
			ref={ref}
			className={cn('mt-auto shrink-0 hairline-t border-border bg-card', isFixed && 'sticky bottom-0 z-40')}
		>
			<Footer className={footerClassName} />
		</div>
	);
});

export default GlobalFooter;
