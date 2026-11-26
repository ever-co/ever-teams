'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';

/**
 * The line every Ever SI conversation carries (spec A7, platform decision D-91). It is true here: conversations
 * stay in this browser only, are forgotten 30 days after their last message (`chat-history.ts`), and "Delete
 * conversation" in the history menu removes one at once.
 */
export function EverSiDisclosure({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	return <p className={cn('text-center text-xs text-muted-foreground text-pretty', className)}>{t('chatView.DISCLOSURE')}</p>;
}
