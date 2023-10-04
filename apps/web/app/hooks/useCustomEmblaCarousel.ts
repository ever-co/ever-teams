import useEmblaCarousel, { EmblaOptionsType } from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';

export const useCustomEmblaCarousel = (
	startIndex = 0,
	options?: Partial<EmblaOptionsType>
) => {
	const [viewportRef, emblaApi] = useEmblaCarousel({
		loop: false,
		startIndex,
		...options
	});

	const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
	const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

	const scrollPrev = useCallback(
		() => emblaApi && emblaApi.scrollPrev(),
		[emblaApi]
	);
	const scrollNext = useCallback(
		() => emblaApi && emblaApi.scrollNext(),
		[emblaApi]
	);
	const scrollTo = useCallback(
		(index: number) => emblaApi && emblaApi.scrollTo(index),
		[emblaApi]
	);

	const onSelect = useCallback(() => {
		if (!emblaApi) return;
		setSelectedIndex(emblaApi.selectedScrollSnap());
		setPrevBtnEnabled(emblaApi.canScrollPrev());
		setNextBtnEnabled(emblaApi.canScrollNext());
	}, [emblaApi, setSelectedIndex]);

	useEffect(() => {
		if (!emblaApi) return;
		onSelect();
		setScrollSnaps(emblaApi.scrollSnapList());
		emblaApi.on('select', onSelect);
		emblaApi.on('reInit', onSelect);
	}, [emblaApi, setScrollSnaps, onSelect]);

	return {
		viewportRef,
		scrollPrev,
		scrollNext,
		prevBtnEnabled,
		nextBtnEnabled,
		selectedIndex,
		scrollSnaps,
		scrollTo,
		emblaApi
	};
};
