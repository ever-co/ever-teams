import React from 'react';
import { useTranslations } from 'next-intl';

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
		<section aria-label="Productivity Statistics" className="flex gap-4">
			<article className="flex flex-col items-start justify-center border-l border-l-gray-100 dark:border-l-gray-700 gap-2 h-[105px] w-[176px] px-4">
				<h2
					className="text-[32px] font-bold"
					aria-label={`${t('common.PRODUCTIVE')} percentage: ${productivePercentage}%`}
				>
					{productivePercentage}%
				</h2>
				<div className="flex gap-2 items-center" role="presentation">
					<div className="w-3 h-3 bg-blue-600 rounded" role="presentation" aria-hidden="true"></div>
					<span className="text-[#60646C]">{t('common.PRODUCTIVE')}</span>
				</div>
			</article>
			<article className="flex flex-col items-start justify-center border-l border-l-gray-100 dark:border-l-gray-700 gap-2 h-[105px] w-[176px] px-4">
				<h2
					className="text-[32px] font-bold"
					aria-label={`${t('common.NEUTRAL')} percentage: ${neutralPercentage}%`}
				>
					{neutralPercentage}%
				</h2>
				<div className="flex gap-2 items-center" role="presentation">
					<div className="w-3 h-3 bg-yellow-400 rounded" role="presentation" aria-hidden="true"></div>
					<span className="text-[#60646C]">{t('common.NEUTRAL')}</span>
				</div>
			</article>
			<article className="flex flex-col items-start justify-center border-l border-l-gray-100 dark:border-l-gray-700 gap-2 h-[105px] w-[176px] px-4">
				<h2
					className="text-[32px] font-bold"
					aria-label={`${t('common.UNPRODUCTIVE')} percentage: ${unproductivePercentage}%`}
				>
					{unproductivePercentage}%
				</h2>
				<div className="flex gap-2 items-center" role="presentation">
					<div className="w-3 h-3 bg-red-500 rounded" role="presentation" aria-hidden="true"></div>
					<span className="text-[#60646C]">{t('common.UNPRODUCTIVE')}</span>
				</div>
			</article>
		</section>
	);
};
