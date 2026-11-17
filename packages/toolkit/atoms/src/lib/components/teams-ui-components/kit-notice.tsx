'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@ever-teams/toolkit-ui';
import { useTimerStatusContext } from '@lib/context/teams-timer-status-context';
import { KIT_ERROR_MESSAGE_KEYS, KitNotice as IKitNotice } from '@lib/errors/kit-error';
import { useClearKitSession } from '@hooks/useClearKitSession';

// Unreachable is a state the kit recovers from by itself; the others need someone to act.
function toneOf(kind: IKitNotice['kind']): string {
	if (kind === 'unreachable') {
		return 'bg-foreground/5 ring-foreground/10';
	}
	return 'bg-destructive/5 ring-destructive/20';
}

// The stored session the kit reads back at the next load: emptied too, or a reload would bring the ended one back.
function forgetStoredSession() {
	try {
		window.localStorage.setItem('_teams-store', JSON.stringify({ app: { user: null }, persist: { token: null } }));
	} catch {
		// Storage unavailable (private mode, quota): the in-memory session is cleared all the same.
	}
}

/**
 * What went wrong for the widgets of this page (site not allowed, session ended, no permission, Ever Teams unreachable,
 * or the API's own refusal), drawn inside the widget instead of a toast on the host page. The provider's live region
 * announces it; it goes away once a read succeeds.
 */
export function KitNotice({ className }: Readonly<{ className?: string }>) {
	const { t } = useTranslation();
	const shared = useTimerStatusContext();
	const clearSession = useClearKitSession();
	const notice = shared?.notice;
	if (!notice) {
		return null;
	}

	// The API's own text for any other refusal, else the kit's words for the kind.
	let text = notice.message ?? '';
	if (notice.kind !== 'other') {
		text = t(KIT_ERROR_MESSAGE_KEYS[notice.kind]);
	}

	const signInAgain = () => {
		forgetStoredSession();
		clearSession();
		shared.reportNotice(null);
	};

	return (
		<div
			data-ever-teams-notice={notice.kind}
			className={cn(
				'mt-2 flex max-w-xs items-start gap-2 rounded-lg px-3 py-2 text-xs leading-snug text-foreground ring-1',
				toneOf(notice.kind),
				className
			)}
		>
			<span className="min-w-0">{text}</span>
			{notice.kind === 'session' && (
				<button
					type="button"
					onClick={signInAgain}
					className="shrink-0 font-medium text-primary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
				>
					{t('KIT_ERRORS.SIGN_IN_AGAIN')}
				</button>
			)}
		</div>
	);
}
