'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';

interface MeetRoomErrorProps {
	title: string;
	description: string;
	/** Tries the failed step again in place; left out when only the app's configuration can fix it. */
	onRetry?: () => void;
}

/** A meeting room that cannot open, where the room would be: what failed, a retry that keeps the page, the way home. */
export function MeetRoomError({ title, description, onRetry }: Readonly<MeetRoomErrorProps>) {
	const t = useTranslations();
	const router = useRouter();

	return (
		<div className="flex h-dvh w-full items-center justify-center p-4">
			<Notice
				tone="error"
				title={title}
				description={description}
				className="w-full max-w-md"
				actions={
					<>
						<Button type="button" variant="ghost" size="default" onClick={() => router.push('/')}>
							{t('collaborate.BACK_HOME')}
						</Button>
						{onRetry && (
							<Button type="button" variant="outline" size="default" onClick={onRetry}>
								{t('collaborate.TRY_AGAIN')}
							</Button>
						)}
					</>
				}
			/>
		</div>
	);
}
