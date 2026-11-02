import SadCry from '@/core/components/svgs/sad-cry';
import { Text } from '@/core/components/common/typography';
import { useTranslations } from 'next-intl';
// Static on purpose: this screen shows up once the network is gone, when a lazy chunk can no longer be fetched.
// Only the (main) layout reaches this file, so the auth routes do not compile the Timer.
import { Timer } from '../../timer/timer';
import {
	SystemPageFrame,
	SYSTEM_PAGE_EYEBROW_CLASS,
	SYSTEM_PAGE_TEXT_CLASS,
	SYSTEM_PAGE_TITLE_CLASS
} from '../error/system-page-frame';

interface IPropsOffline {
	showTimer?: boolean;
}

function Offline({ showTimer }: IPropsOffline) {
	const t = useTranslations();

	return (
		<SystemPageFrame>
			<div className="flex flex-col items-center gap-3 text-muted-foreground">
				<SadCry width={48} height={48} fill="currentColor" />
				<Text className={SYSTEM_PAGE_EYEBROW_CLASS}>{t('pages.offline.STATUS_NETWORK')}</Text>
			</div>

			<Text className={SYSTEM_PAGE_TITLE_CLASS}>{t('pages.offline.HEADING_TITLE')}</Text>
			<Text className={SYSTEM_PAGE_TEXT_CLASS}>{t('pages.offline.HEADING_SUB_DESCRIPTION')}</Text>
			{showTimer && <Timer showTimerButton={false} className="rounded-lg bg-foreground/[0.025] p-4" />}
			<Text className="text-sm text-balance text-muted-foreground">{t('pages.offline.HEADING_DESCRIPTION')}</Text>
		</SystemPageFrame>
	);
}

export default Offline;
