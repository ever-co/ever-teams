import { ContainerProps } from '../../types/container-types';

/**
 * Default configuration for ResizableContainer component
 */
export const defaultContainerProps: ContainerProps = {
	flexDirection: 'column',
	alignItems: 'flex-start',
	justifyContent: 'flex-start',
	fillSpace: 'no',
	padding: ['0', '0', '0', '0'],
	margin: ['0', '0', '0', '0'],
	background: { r: 255, g: 255, b: 255, a: 1 },
	color: { r: 0, g: 0, b: 0, a: 1 },
	shadow: 0,
	radius: 0,
	width: '100%',
	height: 'auto',
	className: 'dark:bg-gray-800 dark:text-gray-100 transition-colors duration-200',
	children: null
};
