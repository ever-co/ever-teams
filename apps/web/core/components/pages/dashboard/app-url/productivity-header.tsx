import React from 'react';
import { useTranslations } from 'next-intl';

interface ProductivityHeaderProps {
	month: string;
	year: number | string;
}

export const ProductivityHeader: React.FC<ProductivityHeaderProps> = ({ month, year }) => {
	const t = useTranslations();

	return (
		<div className="flex flex-col">
			<h2 className="text-lg font-semibold text-balance">{`${month} ${year}`}</h2>
			<p className="text-sm text-muted-foreground">{t('dashboard.PRODUCTIVITY_BREAKDOWN', { month })}</p>
		</div>
	);
};
