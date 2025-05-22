interface EarningsCellProps {
	earnings: number;
}

export function EarningsCell({ earnings }: EarningsCellProps) {
	return (
		<span className="text-gray-900 dark:text-gray-100 font-medium">
			{earnings.toFixed(2)} USD
		</span>
	);
}
