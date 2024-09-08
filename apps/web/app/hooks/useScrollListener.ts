'use client';
import React from 'react';

export function useScrollListener() {
	const [scrolling, setScrolling] = React.useState(false);
	React.useEffect(() => {
		const handleScroll = () => {
			if (window.scrollY > 100) {
				setScrolling(true);
			} else {
				setScrolling(false);
			}
		};
		console.log(window.scrollY);
		window.addEventListener('scroll', handleScroll);
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	}, []);

	return { scrolling };
}
