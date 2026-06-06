import { useEditor } from '@craftjs/core';
import { Resizer } from '..';
import { ContainerSettings } from './container-settings';
import { EmptyContainerState } from './empty-state';
import { ResizableContainerComponent } from '../../types/container-types';
import { defaultContainerProps } from './default-props';

/**
 * A container component that can be resized and has customizable styling
 */
export const ResizableContainer: ResizableContainerComponent = (props) => {
	const {
		flexDirection,
		alignItems,
		justifyContent,
		fillSpace,
		background,
		color,
		padding,
		margin,
		shadow,
		radius,
		children,
		className
	} = { ...defaultContainerProps, ...props };

	const style: React.CSSProperties = {
		justifyContent,
		flexDirection,
		alignItems,
		background: `rgba(${Object.values(background)})`,
		color: `rgba(${Object.values(color)})`,
		padding: padding?.map((p) => `${p}px`).join(' '),
		margin: margin?.map((m) => `${m}px`).join(' '),
		boxShadow: shadow ? `0px 3px 100px ${shadow}px rgba(0, 0, 0, 0.13)` : 'none',
		borderRadius: `${radius}px`,
		flex: fillSpace === 'yes' ? 1 : 'unset',
		transition: 'background 0.2s, color 0.2s, box-shadow 0.3s, border-radius 0.2s'
	};

	const { nodes } = useEditor((state) => state);
	const hasChildNodes = Object.entries(nodes).some(([, node]) => node.data.props?.id !== 'no-drag');

	// Get the selected status to add a highlight effect
	const { selected } = useEditor((state, query) => {
		const currentNodeId = Object.keys(nodes).find(
			(id) => nodes[id].data.type === ResizableContainer.craft?.displayName
		);
		return {
			selected: currentNodeId ? query.getEvent('selected').contains(currentNodeId) : false
		};
	});

	// Add responsive styles based on theme
	const themeClass = className || 'dark:bg-gray-800 dark:text-gray-100';
	const selectedClass = selected ? 'ring-2 ring-primary/30 dark:ring-primary/50' : '';

	return (
		<Resizer
			propKey={{ width: 'width', height: 'height' }}
			style={style}
			className={`${themeClass} ${selectedClass} transition-all duration-200`}
			id="no-drag"
		>
			{!hasChildNodes && <EmptyContainerState />}
			{children}
		</Resizer>
	);
};

ResizableContainer.craft = {
	displayName: 'Container',
	props: defaultContainerProps,
	rules: {
		canDrag: () => true
	},
	related: {
		toolbar: ContainerSettings
	}
};
