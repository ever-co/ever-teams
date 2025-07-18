interface EarningsCellProps {
	earnings?: number;
	currency?: string;
}

export function EarningsCell({ earnings, currency = 'USD' }: EarningsCellProps) {
	if (earnings === null || earnings === undefined)
		return <span className="text-gray-500 dark:text-gray-100">No rate defined</span>;
	return (
		<span className="text-gray-500 dark:text-gray-100">
			{earnings.toFixed(2)} {currency}
		</span>
	);
}
