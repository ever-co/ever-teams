'use client';

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';

import Link from 'next/link';

import { useActiveIndicator } from '@/core/hooks/common/use-active-indicator';
import { cn } from '@/core/lib/helpers';
import { scrollBehavior } from '@/core/lib/utils/motion';

export interface LinkTabItem {
	key: string;
	href: string;
	label: ReactNode | ((isActive: boolean) => ReactNode);
	testId?: string;
}

interface LinkTabsProps {
	label: string;
	items: LinkTabItem[];
	activeKey: string;
	/** Handles a plain click instead of navigating; a modified click still opens the href in a new tab. */
	onSelect?: (key: string) => void;
	className?: string;
}

function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
	const isMainButton = event.button === 0;
	const hasModifier = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
	return isMainButton && !hasModifier;
}

function labelFor(item: LinkTabItem, isActive: boolean): ReactNode {
	if (typeof item.label === 'function') {
		return item.label(isActive);
	}
	return item.label;
}

function ariaCurrentFor(isActive: boolean) {
	if (isActive) {
		return 'page' as const;
	}
	return undefined;
}

/**
 * Tabs that are links: the picked tab takes the ink colour and one underline slides to it. The underline
 * follows the tap first, then the URL, so it moves at once even when the page takes a moment to answer.
 */
export function LinkTabs({ label, items, activeKey, onSelect, className }: LinkTabsProps) {
	const [current, setCurrent] = useState(activeKey);
	const [lastActiveKey, setLastActiveKey] = useState(activeKey);
	const { listRef, activeRef, box } = useActiveIndicator<HTMLUListElement, HTMLAnchorElement>(current);
	const scrollerRef = useRef<HTMLElement>(null);
	const hasScrolled = useRef(false);

	if (activeKey !== lastActiveKey) {
		setLastActiveKey(activeKey);
		setCurrent(activeKey);
	}

	useEffect(() => {
		const scroller = scrollerRef.current;
		const item = activeRef.current;
		if (!scroller || !item || scroller.scrollWidth <= scroller.clientWidth) return;
		const left = item.offsetLeft - (scroller.clientWidth - item.offsetWidth) / 2;
		const behavior = hasScrolled.current && scrollBehavior();
		scroller.scrollTo({ left: Math.max(0, left), behavior: behavior || 'auto' });
		hasScrolled.current = true;
	}, [current, activeRef]);

	return (
		<nav
			ref={scrollerRef}
			aria-label={label}
			className={cn(
				'border-border no-scrollbar -mx-4 overflow-x-auto hairline-b px-4 sm:mx-0 sm:px-0',
				className
			)}
		>
			<ul ref={listRef} className="relative flex min-w-max items-end gap-6">
				{items.map((item) => {
					const isActive = item.key === current;
					const activeItemRef = isActive && activeRef;
					return (
						<li key={item.key}>
							<Link
								ref={activeItemRef || undefined}
								href={item.href}
								scroll={false}
								onClick={(event) => {
									if (!isPlainClick(event)) {
										return;
									}
									setCurrent(item.key);
									if (onSelect) {
										event.preventDefault();
										onSelect(item.key);
									}
								}}
								aria-current={ariaCurrentFor(isActive)}
								data-testid={item.testId}
								className={cn(
									'focus-visible:ring-ring/25 relative flex items-center gap-1.5 pt-2 pb-3 text-sm font-medium whitespace-nowrap transition-[color] duration-300 outline-none focus-visible:rounded-sm focus-visible:ring-[3px]',
									isActive && 'text-primary-ink',
									!isActive && 'text-foreground/55 hover:text-foreground/80'
								)}
							>
								{labelFor(item, isActive)}
								{isActive && !box && (
									<span
										aria-hidden="true"
										className="bg-primary absolute inset-x-0 bottom-0 h-0.75 rounded-t-full"
									/>
								)}
							</Link>
						</li>
					);
				})}
				{box && (
					<li
						aria-hidden="true"
						style={{ transform: `translateX(${box.left}px)`, width: box.width }}
						className="bg-primary pointer-events-none absolute bottom-0 left-0 h-0.75 rounded-t-full transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
					/>
				)}
			</ul>
		</nav>
	);
}
