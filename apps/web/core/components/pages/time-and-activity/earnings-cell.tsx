interface EarningsCellProps {
	earnings?: number;
	currency?: string;
}

export function EarningsCell({ earnings, currency = 'USD' }: EarningsCellProps) {
	if (earnings === null || earnings === undefined)
		return <span className="text-muted-foreground">No rate defined</span>;
	return (
		<span className="tabular-nums text-muted-foreground">
			{earnings.toFixed(2)} {currency}
		</span>
	);
}
