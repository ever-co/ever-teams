import { PropsWithChildren, ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';

type PageContentScrollerProps = PropsWithChildren<{
	className?: string;
	contentClassName?: string;
	footer?: ReactNode;
	footerFixed?: boolean;
}>;

/** The single vertical scroll owner for application page content. */
export function PageContentScroller({
	children,
	className,
	contentClassName,
	footer,
	footerFixed = false
}: PageContentScrollerProps) {
	return (
		<div
			data-testid="page-scroll-owner"
			data-page-scroll-owner="true"
			className={cn('min-h-0 flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar', className)}
		>
			<div className={cn('flex min-h-full w-full flex-col', contentClassName)}>
				{children}
				{footer ? <div className={cn('mt-auto', footerFixed && 'sticky bottom-0 z-40')}>{footer}</div> : null}
			</div>
		</div>
	);
}
