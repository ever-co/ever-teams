import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from 'components/ui/toast';
import { useToast } from 'components/ui/use-toast';
import { Toaster as ToasterMessage } from '@components/ui/sonner';
import { toast } from 'sonner';
import { useOrganizationTeams } from '@app/hooks';
// import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

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
	const [deletedNotifShowm, setDeletedNotifShowm] = useState(false);
	// const t = useTranslations();

	useEffect(() => {
		let timer: NodeJS.Timeout;
		if (isTeamMemberJustDeleted && !deletedNotifShowm) {
			toast.error('You have been deleted from the team', { id: 'deletion-user', duration: 20000 });
			timer = setTimeout(() => {
				setIsTeamMemberJustDeleted(false);
			}, 10000);
			setDeletedNotifShowm(true);
		}

		return () => clearTimeout(timer);
	}, [deletedNotifShowm, isTeamMemberJustDeleted, setIsTeamMemberJustDeleted]);

	return <ToasterMessage richColors visibleToasts={3} />;
}
