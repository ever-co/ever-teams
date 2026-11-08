'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Gift } from '@/core/components/icons';
import { Sheet, SheetContent, SheetTrigger, floatingSheetSurface } from '@/core/components/common/sheet';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { useWhatsNew } from '@/core/hooks/common/use-whats-new';
import { cn } from '@/core/lib/helpers';
import { WhatsNewPanel } from './whats-new-panel';

/**
 * The gift of the top bar: opens the product's "What's new" beside the page. A dot marks updates the user has not
 * opened the panel on yet; opening it marks them seen, while the entries that were new keep their "New" mark until
 * it closes.
 */
export function WhatsNewButton({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);
	const { entries, isLoading, isError, refetch, seenAt, hasUnseen, markSeen } = useWhatsNew();
	const [seenBeforeOpening, setSeenBeforeOpening] = useState<string | null>(null);

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (nextOpen) {
				setSeenBeforeOpening(seenAt);
			}
			setIsOpen(nextOpen);
		},
		[seenAt]
	);

	// While open, everything listed counts as seen, including entries that arrive after the panel opened.
	useEffect(() => {
		if (isOpen) {
			markSeen();
		}
	}, [isOpen, markSeen]);

	const label = hasUnseen ? t('whatsNew.BUTTON_LABEL_UNSEEN') : t('whatsNew.BUTTON_LABEL');

	return (
		<Sheet open={isOpen} onOpenChange={handleOpenChange}>
			<SheetTrigger
				aria-label={label}
				title={label}
				className={cn(
					buttonVariants({ variant: 'ghost', size: 'icon' }),
					'relative text-muted-foreground data-popup-open:bg-foreground/5 data-popup-open:text-foreground',
					className
				)}
			>
				<Gift className="size-4" aria-hidden="true" />
				{hasUnseen && (
					<span
						aria-hidden="true"
						data-testid="whats-new-unseen-dot"
						className="absolute right-[7px] top-[7px] size-[7px] rounded-full bg-primary ring-2 ring-background"
					/>
				)}
			</SheetTrigger>
			<SheetContent side="right" className={cn(floatingSheetSurface, 'w-[calc(100%-1rem)] sm:w-[26rem]')}>
				<WhatsNewPanel
					entries={entries}
					isLoading={isLoading}
					isError={isError}
					onRetry={() => void refetch()}
					seenAt={seenBeforeOpening}
					onNavigate={() => setIsOpen(false)}
				/>
			</SheetContent>
		</Sheet>
	);
}
