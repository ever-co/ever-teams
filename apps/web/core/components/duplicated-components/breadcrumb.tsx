import { clsxm } from '@/core/lib/utils';
import Link from 'next/link';
import React from 'react';
import { Skeleton } from '@/core/components/common/skeleton';
import { ChevronRight } from '@/core/components/icons';

type Crumb = string | { title: string; href: string };

type Props = {
	paths: Crumb[];
	className?: string;
};

const CRUMB_LINK =
	'rounded-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

function isCurrentCrumb(index: number, count: number) {
	return index === count - 1;
}

/** The page's path in the top bar: muted ancestors, the current page in the foreground colour, 13px like Linear's bar. */
export function Breadcrumb({ paths, className }: Props) {
	return (
		<nav aria-label="breadcrumb" className={clsxm('min-w-0', className, 'text-[13px]')}>
			<ol className="flex min-w-0 flex-row items-center gap-1.5">
				{paths.map((path, index) => {
					const isCurrent = isCurrentCrumb(index, paths.length);
					const isFirst = index === 0;
					const isLink = typeof path === 'object';
					const title = isLink ? path.title : path;
					const hasTitle = Boolean(title);

					return (
						<React.Fragment key={index}>
							{!isFirst && (
								<li aria-hidden="true" className="shrink-0">
									<ChevronRight className="size-3.5 text-muted-foreground/70" />
								</li>
							)}
							<li
								className={clsxm('min-w-0 truncate', isCurrent && 'font-medium text-foreground')}
								aria-current={isCurrent ? 'page' : undefined}
							>
								{!isLink && (
									<span className={clsxm(!isCurrent && 'text-muted-foreground')}>{title}</span>
								)}

								{isLink && (
									<Link
										href={path.href}
										className={clsxm(CRUMB_LINK, isCurrent && 'text-foreground')}
									>
										{hasTitle && title}
										{!hasTitle && (
											<Skeleton className="inline-block h-4 w-[120px] rounded-md align-middle" />
										)}
									</Link>
								)}
							</li>
						</React.Fragment>
					);
				})}
			</ol>
		</nav>
	);
}
