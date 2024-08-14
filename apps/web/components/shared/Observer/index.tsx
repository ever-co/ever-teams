import { useCallbackRef } from '@app/hooks';
import React from 'react';

export const ObserverComponent = ({
	isLast,
	getNextData
}: {
	root?: JSX.Element;
	isLast: boolean;
	getNextData: () => any;
}) => {
	const getNextDataRef = useCallbackRef(getNextData);
	const cardRef = React.useRef<HTMLDivElement>();

	React.useEffect(() => {
		if (!cardRef?.current) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (isLast && entry.isIntersecting) {
					// fetch with new Entry
					console.log('IN OBSERVER');
					getNextDataRef.current && getNextDataRef.current();
					observer.unobserve(entry.target);
				}
			},
			{
				threshold: 1.0
			}
		);

		observer.observe(cardRef.current);

		return () => {
			// eslint-disable-next-line react-hooks/exhaustive-deps
			cardRef.current && observer.unobserve(cardRef.current);
		};
	}, [isLast, getNextDataRef]);
	// @ts-expect-error
	return <div ref={cardRef} className="-z-10 h-2 bg-transparent  " />;
};

export const useElementOnScreen = (options: IntersectionObserverInit | undefined) => {
	const containerRef = React.useRef<HTMLDivElement>();
	const [isVisible, setIsVisible] = React.useState();

	const cbFunction = (entries: any[]) => {
		const [entry] = entries;
		setIsVisible(entry.isIntersecting);
	};

	React.useEffect(() => {
		const observer = new IntersectionObserver(cbFunction, options);
		if (containerRef.current) observer.observe(containerRef.current);

		return () => {
			// eslint-disable-next-line react-hooks/exhaustive-deps
			if (containerRef.current) observer.unobserve(containerRef.current);
		};
	}, [containerRef, options]);

	return [isVisible, containerRef];
};
