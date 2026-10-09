'use client';

import { useTranslations } from 'next-intl';
import { EverConnectPanel } from './ever-connect-panel';
import { EverStatsCard } from './ever-stats-card';

/**
 * Settings > Team > Ever Platform. Every part is optional and everything it shows lives in the paired
 * API; this app stores nothing of it.
 *
 * - The connection parts, only when `connectAvailable` (NEXT_PUBLIC_EVER_CONNECT_ENABLED is 'true' and
 *   the paired API's `health` answered 200 to the signed-in person).
 * - The anonymous usage statistics card, whenever this web app runs its statistics module.
 */
export function EverPlatformSection({ connectAvailable, connected }: { connectAvailable: boolean; connected: boolean }) {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-6" data-testid="ever-platform-section">
			<p className="text-sm">{t('pages.settingsTeam.everPlatform.DESCRIPTION')}</p>
			{connectAvailable ? <EverConnectPanel connected={connected} /> : null}
			<EverStatsCard />
		</div>
	);
}
