import { IIconProps } from '@app/interfaces/hooks';

export const LeftArrow = ({ width, height }: IIconProps) => {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M9.57 5.93018L3.5 12.0002L9.57 18.0702"
				stroke="#282048"
				stroke-width="1.5"
				stroke-miterlimit="10"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<path
				d="M20.4999 12H3.66992"
				stroke="#282048"
				stroke-width="1.5"
				stroke-miterlimit="10"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	);
};
