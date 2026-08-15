import * as React from 'react';
import { Card, CardContent } from '@ever-teams/toolkit-ui';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@ever-teams/toolkit-ui';

interface CarouselSpacingProps {
	/**
	 * Defines the orientation of the carousel. It can be 'horizontal' or 'vertical'.
	 *
	 * @type {'vertical' | 'horizontal'}
	 * @default 'horizontal'
	 */
	orientation?: 'vertical' | 'horizontal';

	/**
	 * An array of items to display in the carousel.
	 * This can be either an array of strings or numbers.
	 *
	 * @type {(string[] | number[])}
	 */
	items: string[] | number[];

	/**
	 * Optional CSS class for setting the width of each item in the carousel.
	 * Defaults to "basis-1/2" which represents 50% of the available space.
	 *
	 * @type {string}
	 * @default "basis-1/2"
	 */
	itemWidth?: string;

	/**
	 * Optional custom render function for each item in the carousel.
	 * If provided, this function is used to render the content of each item.
	 * If not provided, the item itself (as a string or number) will be rendered.
	 *
	 * @type {(item: string | number, index: number) => React.ReactNode}
	 */
	renderItem?: (item: string | number, index: number) => React.ReactNode;
}

/**
 * A responsive carousel component that displays a list of items.
 * Each item can be customized using the `renderItem` prop.
 * The width of each item can be controlled using the `itemWidth` prop.
 * The orientation of the carousel can be set to either 'horizontal' or 'vertical'.
 *
 * @export
 * @param {CarouselSpacingProps} {
 *   items,               // The list of items to display in the carousel
 *   itemWidth = "basis-1/2",  // The default width of each item
 *   renderItem,          // Optional custom render function for items
 *   orientation = "horizontal" // Orientation of the carousel
 * }
 * @return {React.ReactElement} The rendered carousel component.
 */
export function CarouselSpacing({
	items,
	itemWidth = 'basis-1/2',
	renderItem,
	orientation = 'horizontal'
}: CarouselSpacingProps): React.ReactElement {
	return (
		<Carousel orientation={orientation} className="w-full max-w-sm">
			<CarouselContent className="-ml-1">
				{items.map((item, index) => (
					<CarouselItem key={index} className={`pl-1 md:${itemWidth} lg:basis-1/3`}>
						<div className="p-1">
							<Card>
								<CardContent className="flex aspect-square items-center justify-center p-6">
									{renderItem ? (
										renderItem(item, index)
									) : (
										<span className="text-2xl font-semibold">{item}</span>
									)}
								</CardContent>
							</Card>
						</div>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious />
			<CarouselNext />
		</Carousel>
	);
}
