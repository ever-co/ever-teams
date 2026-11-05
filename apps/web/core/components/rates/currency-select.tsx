'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { controlRecipe } from '@/core/components/common/input';
import { cn } from '@/core/lib/helpers';
import { currencyCodesOf, currencyLabelOf } from '@/core/lib/utils/rates';

type CurrencySelectProps = {
	id: string;
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	className?: string;
};

export function CurrencySelect({ id, value, onChange, disabled, className }: Readonly<CurrencySelectProps>) {
	const locale = useLocale();
	const options = useMemo(() => {
		const codes = currencyCodesOf(value);
		return codes.map((code) => ({ code, label: currencyLabelOf(code, locale) }));
	}, [locale, value]);

	return (
		<select
			id={id}
			value={value}
			disabled={disabled}
			onChange={(event) => onChange(event.target.value)}
			className={cn(controlRecipe, 'h-8 px-2 text-[13px]', className)}
		>
			{options.map((option) => (
				<option key={option.code} value={option.code}>
					{option.label}
				</option>
			))}
		</select>
	);
}
