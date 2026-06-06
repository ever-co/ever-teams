import { CarouselSpacing } from '@ever-teams/atoms';
import { Input as Inputs } from '@builder.io/sdk';

interface BasicCarouselSpacingProps {
	orientation: 'vertical' | 'horizontal';
	items?: string[] | number[]; // Restrict to either string[] or number[]
	itemWidth?: string; // Optional: Width of each item
	renderItem?: (item: string | number, index: number) => React.ReactNode; // Optional: Custom render function for items
}

export function BasicCarouselSpacing({
	items = [1, 2, 3, 4, 5], // Default items
	itemWidth = 'basis-1/3', // Default item width
	renderItem = (item) => <span className="text-3xl">{item}</span> // Default render function
}: BasicCarouselSpacingProps) {
	return <CarouselSpacing items={items} itemWidth={itemWidth} renderItem={renderItem} />;
}

export const InputBasicCarousel: Inputs[] = [
	{
		name: 'orientation',
		type: 'enum',
		required: true,
		friendlyName: 'Orientation',
		defaultValue: 'horizontal',
		enum: [
			{ label: 'Horizontal', value: 'horizontal' },
			{ label: 'Vertical', value: 'vertical' }
		]
	},
	{
		name: 'items',
		type: 'list',
		defaultValue: [1, 2, 3, 4, 5]
	},
	{
		name: 'itemWidth',
		type: 'string',
		defaultValue: 'basis-1/3'
	},
	{
		name: 'itemContent',
		type: 'string', // or 'block', depending on supported types
		defaultValue: '<span className="text-3xl">{item}</span>'
	}
];
