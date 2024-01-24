import React from 'react';

export const ObserverComponent = ({ isLast, getNextData }: { isLast: boolean; getNextData: () => any }) => {
	const cardRef = React.useRef<HTMLDivElement>();

	React.useEffect(() => {
		if (!cardRef?.current) return;

		const observer = new IntersectionObserver(([entry]) => {
			if (isLast && entry.isIntersecting) {
				// fetch with new Entry
				console.log('IN OBSERVER');
				getNextData();
				observer.unobserve(entry.target);
			}
		});

		observer.observe(cardRef.current);
	}, [isLast, getNextData]);
	// @ts-expect-error
	return <div ref={cardRef} className="-z-10 h-2 bg-transparent  " />;
};
