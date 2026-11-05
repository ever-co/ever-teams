import { durationPartsOf } from '@/core/lib/utils/dashboard-figures';

const UNIT = 'text-base font-normal text-muted-foreground';

export function DurationValue({ seconds }: Readonly<{ seconds: number }>) {
	const { hours, minutes } = durationPartsOf(seconds);
	return (
		<>
			{hours}
			<span className={UNIT}>h</span> {minutes}
			<span className={UNIT}>m</span>
		</>
	);
}
