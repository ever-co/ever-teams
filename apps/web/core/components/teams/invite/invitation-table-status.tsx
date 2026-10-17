import { CheckIcon } from '@heroicons/react/20/solid';
import { CrossIcon } from 'assets/svg';
import { useTranslations } from 'next-intl';
interface isProps {
	status: string | undefined;
	acceptJoinRequest: () => void;
	rejectJoinRequest: () => void;
}

const CHIP = 'inline-flex h-7 items-center justify-center whitespace-nowrap rounded-md px-2.5 text-xs font-medium';
const ACTION = 'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors';

export const InvitationTableStatus = ({ status, acceptJoinRequest, rejectJoinRequest }: isProps) => {
	const t = useTranslations();
	const RenderStatus = (status: string | undefined) => {
		switch (status) {
			case 'ACCEPTED':
				return (
					<div className={`${CHIP} bg-emerald-500/10 text-emerald-700 dark:text-emerald-400`}>
						{t('common.ACCEPTED')}
					</div>
				);
			case 'INVITED':
				return <div className={`${CHIP} bg-muted text-muted-foreground`}>{t('common.INVITED')}</div>;
			case 'REJECTED':
				return <div className={`${CHIP} bg-destructive/10 text-destructive`}>{t('common.REJECTED')}</div>;
			case 'EXPIRED':
				return <div className={`${CHIP} bg-destructive/10 text-destructive`}>{t('common.EXPIRED')}</div>;
			case 'REQUESTED':
				return (
					<div className="flex items-center gap-1">
						<div className={`${CHIP} bg-primary/10 text-primary`}>{t('common.REQUEST')}</div>
						<div
							className={`${ACTION} bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400`}
							onClick={acceptJoinRequest}
						>
							<CheckIcon className="size-4" />
						</div>
						<div
							className={`${ACTION} bg-destructive/10 text-destructive hover:bg-destructive/20`}
							onClick={rejectJoinRequest}
						>
							<CrossIcon className="size-4" />
						</div>
					</div>
				);
			default:
				return <></>;
		}
	};
	return RenderStatus(status);
};
