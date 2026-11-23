import { useEffect, useState } from 'react';

const TICK_MS = 1000;

/** The time now, read again each second while `ticking`, and still otherwise: a stopped timer renders nothing more. */
export function useNow(ticking: boolean): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!ticking) {
			return undefined;
		}
		setNow(Date.now());
		const timer = setInterval(() => setNow(Date.now()), TICK_MS);
		return () => clearInterval(timer);
	}, [ticking]);
	return now;
}
