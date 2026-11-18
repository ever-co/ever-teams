'use client';

import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';

/** Under the Label grouping, an entry with several labels counts under each: the groups add up to more than the total. */
export function LabelOverlapNotice() {
	const t = useTranslations();
	return (
		<Notice
			tone="info"
			title={t('timer.labels.OVERLAP_TITLE')}
			description={t('timer.labels.OVERLAP_MESSAGE')}
			className="mx-3 mt-3"
		/>
	);
}
