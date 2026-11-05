import { Check as CheckIcon } from '@/core/components/icons';
import { CrossIcon } from 'assets/svg';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
interface isProps {
	status: string | undefined;
	acceptJoinRequest: () => void;
	rejectJoinRequest: () => void;
}

/** The soft pair of the badge recipe: a tint and its ink, never a fill with white text. */
const CHIP = 'inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium';

export const InvitationTableStatus = ({ status, acceptJoinRequest, rejectJoinRequest }: isProps) => {
	const t = useTranslations();
	const RenderStatus = (status: string | undefined) => {
		switch (status) {
			case 'ACCEPTED':
				return <div className={`${CHIP} bg-success/10 text-success-foreground`}>{t('common.ACCEPTED')}</div>;
			case 'INVITED':
				return <div className={`${CHIP} bg-foreground/5 text-muted-foreground`}>{t('common.INVITED')}</div>;
			case 'REJECTED':
				return <div className={`${CHIP} bg-destructive/10 text-destructive-ink`}>{t('common.REJECTED')}</div>;
			case 'EXPIRED':
				return <div className={`${CHIP} bg-destructive/10 text-destructive-ink`}>{t('common.EXPIRED')}</div>;
			case 'REQUESTED':
				return (
					<div className="flex items-center gap-1">
						<div className={`${CHIP} bg-primary/10 text-primary-ink`}>{t('common.REQUEST')}</div>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="bg-success/10 text-success-foreground hover:bg-success/20 hover:text-success-foreground"
							onClick={acceptJoinRequest}
						>
							<CheckIcon className="size-4" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="bg-destructive/10 text-destructive-ink hover:bg-destructive/20 hover:text-destructive-ink"
							onClick={rejectJoinRequest}
						>
							<CrossIcon className="size-4" />
						</Button>
					</div>
				);
			default:
				return <></>;
		}
	};
	return RenderStatus(status);
};
