import {
	Toast,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport
} from '@/core/components/common/toast';
import { useToast } from '@/core/hooks/common/use-toast';
import { Toaster as ToasterMessage } from '@/core/components/common/sonner';
import { toast } from 'sonner';
import { useOrganizationTeams } from '@/core/hooks';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export function Toaster() {
	const { toasts } = useToast();

	return (
		<ToastProvider>
			{toasts.map(function ({ id, title, description, action, ...props }) {
				return (
					<Toast key={id} {...props}>
						<div className="grid gap-1">
							{title && <ToastTitle>{title}</ToastTitle>}
							{description && <ToastDescription>{description}</ToastDescription>}
						</div>
						{action}
						<ToastClose />
					</Toast>
				);
			})}
			<ToastViewport />
		</ToastProvider>
	);
}

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

	return <ToasterMessage richColors visibleToasts={3} />;
}
