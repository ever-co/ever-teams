import { FC } from 'react';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { useTranslations } from 'next-intl';

export const EmptyTimeActivity: FC = () => {
	const t = useTranslations();

	return (
		<div className="p-8">
			<AnimatedEmptyState
				showBorder={false}
				title={t('timeActivity.NO_ACTIVITY_DATA')}
				message={
					<>
						{t('timeActivity.NO_ACTIVITY_DATA_MESSAGE')}{' '}
						<span className="text-primary-ink">{t('timeActivity.START_TRACKING_MESSAGE')}</span>
					</>
				}
			/>
		</div>
	);
};
