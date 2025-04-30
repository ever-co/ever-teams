'use client';
import React from 'react';
import { TimesheetLog } from '../../app/interfaces';

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

export const useInfinityScroll = (timesheet: TimesheetLog[]) => {
	const [items, setItems] = React.useState<TimesheetLog[]>(timesheet);
	const [page, setPage] = React.useState(1);
	const [isLoading, setIsLoading] = React.useState(false);

	React.useEffect(() => {
		const handleScroll = () => {
			if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 && !isLoading) {
				setPage((prevPage) => prevPage + 1);
			}
		};
		window.addEventListener('scroll', handleScroll);
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	}, [isLoading]);

	return { items, page, setIsLoading, setItems };
};
