'use client';

import { ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import NoTeam from '@/core/components/common/no-team';
import { Button } from '@/core/components/duplicated-components/_button';
import { Lock } from '@/core/components/icons';
import { activeTeamState, canManageActiveTeamState, isTeamMemberState } from '@/core/stores';
import { SETTINGS_COLUMN } from './settings-page';

type TeamSettingsGateProps = {
	skeleton: ReactNode;
	requiresManager?: boolean;
	children: ReactNode;
};

function ManagersOnly() {
	const t = useTranslations();
	return (
		<div className={SETTINGS_COLUMN}>
			<div className="flex flex-col items-center gap-3 rounded-xl bg-card px-6 py-12 text-center hairline-ring ring-border shadow-sm shadow-black/6.5">
				<span className="flex size-9 items-center justify-center rounded-[10px] keycap-3d text-foreground/70">
					<Lock className="size-4.5" />
				</span>
				<p className="text-[15px] font-semibold text-foreground">{t('settings.common.MANAGERS_ONLY_TITLE')}</p>
				<p className="max-w-sm text-[13px] text-pretty text-muted-foreground">
					{t('settings.common.MANAGERS_ONLY_DESCRIPTION')}
				</p>
				<Button asChild variant="outline" className="mt-1">
					<Link href="/settings/team">{t('settings.entries.teamGeneral.TITLE')}</Link>
				</Button>
			</div>
		</div>
	);
}

export function TeamSettingsGate({ skeleton, requiresManager = false, children }: Readonly<TeamSettingsGateProps>) {
	const isTeamMember = useAtomValue(isTeamMemberState);
	const activeTeam = useAtomValue(activeTeamState);
	const canManageTeam = useAtomValue(canManageActiveTeamState);
	const isTeamLoading = !activeTeam?.id;
	const isRefused = requiresManager && !canManageTeam;

	if (!isTeamMember) {
		return <NoTeam className="mt-0 py-8 xs:mt-0" />;
	}
	if (isTeamLoading) {
		return <>{skeleton}</>;
	}
	if (isRefused) {
		return <ManagersOnly />;
	}
	return <>{children}</>;
}
