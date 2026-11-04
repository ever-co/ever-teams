'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { Bell } from '@/core/components/icons';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { cn } from '@/core/lib/helpers';
import { useUnreadNotificationCount } from '@/core/hooks/notifications/use-notification-inbox';
import { NotificationPanelSkeleton } from './notification-states';

const NotificationPanel = dynamic(() => import('./notification-panel').then((mod) => mod.NotificationPanel), {
	ssr: false,
	loading: () => <NotificationPanelSkeleton />
});

const PANEL_RECIPE =
	'surface-raised flex w-[26rem] max-w-[calc(100vw-1rem)] max-h-[min(40rem,var(--available-height))] flex-col overflow-hidden rounded-xl text-popover-foreground outline-hidden origin-(--transform-origin) transition-[opacity,scale] duration-150 data-starting-style:scale-[0.98] data-starting-style:opacity-0 data-ending-style:scale-[0.98] data-ending-style:opacity-0';

/**
 * The bell of the top bar. Its dot is fed by one light request polled while the tab is visible; the inbox itself
 * loads with its code the first time the panel opens.
 */
export function NotificationBell({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);
	const unreadCount = useUnreadNotificationCount();
	const hasUnread = unreadCount > 0;
	const label = t('notifications.BELL_LABEL', { count: unreadCount });

	const close = useCallback(() => setIsOpen(false), []);

	return (
		<PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
			<PopoverPrimitive.Trigger
				aria-label={label}
				title={label}
				className={cn(
					buttonVariants({ variant: 'ghost', size: 'icon' }),
					'relative text-muted-foreground data-popup-open:bg-foreground/5 data-popup-open:text-foreground',
					className
				)}
			>
				<Bell className="size-4" aria-hidden="true" />
				{hasUnread && (
					<span
						aria-hidden="true"
						className="absolute right-[7px] top-[7px] size-[7px] rounded-full bg-primary ring-2 ring-background"
					/>
				)}
			</PopoverPrimitive.Trigger>
			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Positioner
					className="z-[1000] outline-hidden"
					side="bottom"
					align="end"
					sideOffset={6}
					collisionPadding={8}
				>
					<PopoverPrimitive.Popup aria-label={t('notifications.TITLE')} className={PANEL_RECIPE}>
						<NotificationPanel onClose={close} unreadCount={unreadCount} />
					</PopoverPrimitive.Popup>
				</PopoverPrimitive.Positioner>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
}
