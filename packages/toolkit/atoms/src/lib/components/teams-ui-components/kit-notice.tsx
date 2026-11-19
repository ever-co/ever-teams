'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@ever-teams/toolkit-ui';
import { useTimerStatusContext } from '@lib/context/teams-timer-status-context';
import { KIT_ERROR_MESSAGE_KEYS, KitNotice as IKitNotice } from '@lib/errors/kit-error';
import { useClearKitSession } from '@hooks/useClearKitSession';
import { useHostSignIn } from '@lib/session/host-session';
import { forgetStoredSession } from '@lib/session/stored-session';
import { useKitOptions } from '@components/teams-provider/kit-options';
import { apiUrlOf } from '@lib/utils/api-url';
import { KIT_NOTICE_ACTION, KIT_NOTICE_SURFACE, kitNoticeTone } from './notice-surface';

// Unreachable is a state the kit recovers from by itself; the others need someone to act.
function toneOf(kind: IKitNotice['kind']): string {
	if (kind === 'unreachable') {
		return kitNoticeTone('neutral');
	}
	return kitNoticeTone('error');
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
	const askHostForToken = useHostSignIn();
	const { api } = useKitOptions();
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
		// The host signs the person in: ask its backend for a new token; the next read that succeeds ends the notice.
		if (askHostForToken) {
			void askHostForToken();
			return;
		}
		// The session the kit would read back at the next load, or a reload would bring the ended one back: this
		// server's only, the providers of other servers stay signed in.
		forgetStoredSession(apiUrlOf(api));
		clearSession();
		shared.reportNotice(null);
	};

	return (
		<div
			data-ever-teams-notice={notice.kind}
			className={cn('mt-2 flex max-w-xs items-start gap-2', KIT_NOTICE_SURFACE, toneOf(notice.kind), className)}
		>
			<span className="min-w-0">{text}</span>
			{notice.kind === 'session' && (
				<button type="button" onClick={signInAgain} className={KIT_NOTICE_ACTION}>
					{t('KIT_ERRORS.SIGN_IN_AGAIN')}
				</button>
			)}
		</div>
	);
}
