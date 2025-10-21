'use client';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAtom } from 'jotai';
import { isTeamMemberJustDeletedState } from '@/core/stores';

export function ToastMessageManager() {
	const [isTeamMemberJustDeleted, setIsTeamMemberJustDeleted] = useAtom(isTeamMemberJustDeletedState);
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
