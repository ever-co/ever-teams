import type { ReactNode } from 'react';
import type { useTranslations } from 'next-intl';
import type { MeetingNotice } from '@/core/lib/notifications/meeting-notices';

type Translate = ReturnType<typeof useTranslations>;

function SenderName({ children }: Readonly<{ children: ReactNode }>) {
	return <span className="font-medium text-foreground">{children}</span>;
}

/**
 * A meeting notification's sentence in the reader's language: who invited, removed, changed or cancelled, or how soon
 * the meeting starts. The meeting's title is the entry's subject, shown beside it. The platform writes its own in
 * English; its time stays in the message, in the person's time zone.
 */
export function meetingSentenceOf(t: Translate, notice: MeetingNotice, senderName: string | null): ReactNode {
	const name = senderName || t('notifications.SOMEONE');
	const rich = { name, b: (chunks: ReactNode) => <SenderName>{chunks}</SenderName> };
	switch (notice.kind) {
		case 'invited':
			return t.rich('notifications.MEETING.INVITED', rich);
		case 'removed':
			return t.rich('notifications.MEETING.REMOVED', rich);
		case 'changed':
			return t.rich('notifications.MEETING.CHANGED', rich);
		case 'cancelled':
			return t.rich('notifications.MEETING.CANCELLED', rich);
		case 'reminder':
			return notice.minutes === null
				? t('notifications.MEETING.SOON')
				: t('notifications.MEETING.REMINDER', { minutes: notice.minutes });
		case 'starting':
			return t('notifications.MEETING.STARTING');
	}
}
