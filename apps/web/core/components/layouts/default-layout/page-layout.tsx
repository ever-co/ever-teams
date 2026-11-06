'use client';

import { cn } from '@/core/lib/helpers';
import { PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react';
import { useElementHeight } from '@/core/hooks/common';
import { useActiveTimer } from '@/core/hooks/common/use-active-timer';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/core/constants/config/constants';
import { pathCarriesItsOwnTimer } from './timer-paths';
import GlobalHeader from './global-header';
import { PageContentScroller } from './page-content-scroller';

type PageLayoutProps = PropsWithChildren<{
	/** Updates the browser tab title ("title | APP_NAME"). */
	title?: string;
	/** Forces the compact timer into the top bar. */
	showTimer?: boolean;
	publicTeam?: boolean;
	notFound?: boolean;
	className?: string;
	childrenClassName?: string;
	/** No effect since the footer left the app pages (only the auth pages keep one); accepted for existing callers. */
	footerClassName?: string;
	/** What the top bar shows at its start: a breadcrumb, or a page title. */
	breadcrumb?: ReactNode;
	/** A toolbar band under the top bar: tabs, filters, a page-level timer. */
	mainHeaderSlot?: ReactNode;
	mainHeaderSlotClassName?: string;
	/** No effect, see `footerClassName`. */
	isFooterFixed?: boolean;
}>;

/** The header height under which a page that carries its own timer still shows the compact one. */
const SHORT_HEADER_HEIGHT = 100;

/**
 * The per-page chrome inside the shell panel: a top bar, an optional toolbar band, then the single
 * scroll owner of the page content. No footer, as in Linear and Jira: language and theme live in the account menu.
 */
export function PageLayout({
	children,
	title,
	showTimer,
	publicTeam,
	notFound,
	className,
	childrenClassName,
	breadcrumb,
	mainHeaderSlot,
	mainHeaderSlotClassName = ''
}: PageLayoutProps) {
	const [shouldRenderTimer, setShouldRenderTimer] = useState(false);
	const { activeTimer, setActiveTimer } = useActiveTimer();
	const path = usePathname();

	const headerRef = useRef<HTMLDivElement>(null);
	const headerHeight = useElementHeight<HTMLDivElement | null>(headerRef);

	useEffect(() => {
		if (!title) return;

		const previousTitle = document.title;
		document.title = `${title} | ${APP_NAME}`;

		return () => {
			document.title = previousTitle;
		};
	}, [title]);

	useEffect(() => {
		if (!headerHeight) return;

		const hasMultipleTimers = pathCarriesItsOwnTimer(path);
		const headerIsShort = headerHeight <= SHORT_HEADER_HEIGHT;
		const shouldActivateTimer = !hasMultipleTimers || headerIsShort;

		setActiveTimer((prev) => {
			if (prev !== shouldActivateTimer) {
				return shouldActivateTimer;
			}
			return prev;
		});
		setShouldRenderTimer(true);
	}, [path, headerHeight, mainHeaderSlot]);

	const timerActive = shouldRenderTimer && activeTimer;
	const headerShowsTimer = timerActive || Boolean(showTimer);

	return (
		<div className="flex h-full min-h-0 w-full flex-col overflow-clip">
			<GlobalHeader
				ref={headerRef}
				showTimer={headerShowsTimer}
				publicTeam={publicTeam || false}
				notFound={notFound || false}
				breadcrumb={breadcrumb}
				mainHeaderSlot={mainHeaderSlot}
				mainHeaderSlotClassName={mainHeaderSlotClassName}
			/>
			<PageContentScroller>
				<main className={cn('relative flex min-h-full w-full flex-col p-4', className)}>
					{/* `clip`, not `hidden`: overflow-x hidden makes this a scroll container of its own. PageContentScroller owns scrolling. */}
					<div
						className={cn(
							'-mx-2 min-h-0 w-[calc(100%+1rem)] flex-1 overflow-x-clip px-2',
							childrenClassName
						)}
					>
						{children}
					</div>
				</main>
			</PageContentScroller>
		</div>
	);
}
