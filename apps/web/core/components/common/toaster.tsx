'use client';
import { toast } from 'sonner';
import { useOrganizationTeams } from '@/core/hooks';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export function ToastMessageManager() {
	const { isTeamMemberJustDeleted, setIsTeamMemberJustDeleted } = useOrganizationTeams();
	const [deletedNotifShown, setDeletedNotifShown] = useState(false);
	const t = useTranslations();

	useEffect(() => {
		let timer: NodeJS.Timeout;
		if (isTeamMemberJustDeleted && !deletedNotifShown) {
			toast.error(t('alerts.ALERT_USER_DELETED_FROM_TEAM'), { duration: 20000 });
			timer = setTimeout(() => {
				setIsTeamMemberJustDeleted(false);
			}, 10000);
			setDeletedNotifShown(true);
		}

		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [deletedNotifShown, isTeamMemberJustDeleted, setIsTeamMemberJustDeleted]);

	return <></>;
}
