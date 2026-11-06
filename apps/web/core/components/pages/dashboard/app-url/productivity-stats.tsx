import React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import { CHART_COLORS } from './productivity-chart';

interface ProductivityStatsProps {
	productivePercentage: number;
	neutralPercentage: number;
	unproductivePercentage: number;
}

export const ProductivityStats: React.FC<ProductivityStatsProps> = ({
	productivePercentage,
	neutralPercentage,
	unproductivePercentage
}) => {
	const t = useTranslations();

	return (
		<section aria-label="Productivity Statistics" className="flex">
			<article className="flex flex-col items-start justify-center hairline-l border-l-border gap-1 h-[105px] w-[176px] px-6">
				<h2
					className="text-2xl font-semibold tabular-nums"
					aria-label={`${t('common.PRODUCTIVE')} percentage: ${productivePercentage}%`}
				>
					{productivePercentage}%
				</h2>
				<div className="flex gap-2 items-center" role="presentation">
					<div className={cn('size-2 rounded-full', CHART_COLORS.productive)} aria-hidden="true"></div>
					<span className="text-xs text-muted-foreground">{t('common.PRODUCTIVE')}</span>
				</div>
			</article>
			<article className="flex flex-col items-start justify-center hairline-l border-l-border gap-1 h-[105px] w-[176px] px-6">
				<h2
					className="text-2xl font-semibold tabular-nums"
					aria-label={`${t('common.NEUTRAL')} percentage: ${neutralPercentage}%`}
				>
					{neutralPercentage}%
				</h2>
				<div className="flex gap-2 items-center" role="presentation">
					<div className={cn('size-2 rounded-full', CHART_COLORS.neutral)} aria-hidden="true"></div>
					<span className="text-xs text-muted-foreground">{t('common.NEUTRAL')}</span>
				</div>
			</article>
			<article className="flex flex-col items-start justify-center hairline-l border-l-border gap-1 h-[105px] w-[176px] px-6">
				<h2
					className="text-2xl font-semibold tabular-nums"
					aria-label={`${t('common.UNPRODUCTIVE')} percentage: ${unproductivePercentage}%`}
				>
					{unproductivePercentage}%
				</h2>
				<div className="flex gap-2 items-center" role="presentation">
					<div className={cn('size-2 rounded-full', CHART_COLORS.unproductive)} aria-hidden="true"></div>
					<span className="text-xs text-muted-foreground">{t('common.UNPRODUCTIVE')}</span>
				</div>
			</article>
		</section>
	);
};
