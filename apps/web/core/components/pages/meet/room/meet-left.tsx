'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { PhoneOff } from '@/core/components/icons';

interface MeetLeftProps {
	title: string | null;
	onRejoin: () => void;
	onBack: () => void;
}

/** After leaving a meeting: the meeting goes on, so the person can come back in, or go back to their meetings. */
export function MeetLeft({ title, onRejoin, onBack }: Readonly<MeetLeftProps>) {
	const t = useTranslations();

	return (
		<div className="flex min-h-full w-full items-center justify-center p-6">
			<div role="status" className="flex max-w-md flex-col items-center gap-4 text-center">
				<span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
					<PhoneOff className="size-6" aria-hidden="true" />
				</span>
				<div className="flex flex-col gap-1">
					<h1 className="text-xl font-semibold text-foreground">{t('meetings.YOU_LEFT')}</h1>
					{title && <p className="text-sm font-medium text-foreground">{title}</p>}
					<p className="text-sm text-muted-foreground">{t('meetings.YOU_LEFT_HINT')}</p>
				</div>
				<div className="flex flex-wrap justify-center gap-2">
					<Button type="button" onClick={onRejoin} data-testid="meet-rejoin">
						{t('meetings.REJOIN')}
					</Button>
					<Button type="button" variant="outline" onClick={onBack}>
						{t('meetings.BACK_TO_MEETINGS')}
					</Button>
				</div>
			</div>
		</div>
	);
}
