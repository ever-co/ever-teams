'use client';
import * as React from 'react';
import { BREAKPOINTS } from '@/lib/config/constants';
const { MOBILE } = BREAKPOINTS;

export function useIsMobile() {
	const [isMobile, setIsMobile] = React.useState<boolean | undefined>(false);

	React.useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${MOBILE - 1}px)`);
		const onChange = () => {
			setIsMobile(window.innerWidth < MOBILE);
		};
		mql.addEventListener('change', onChange);
		setIsMobile(window.innerWidth < MOBILE);
		return () => mql.removeEventListener('change', onChange);
	}, []);

	return !!isMobile;
}
