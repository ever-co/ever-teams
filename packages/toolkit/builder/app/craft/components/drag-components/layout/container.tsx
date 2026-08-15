import { useEditor, useNode } from '@craftjs/core';
import React from 'react';
import { EditBar } from '../../editbar';
import { ConfigItem } from '../../../types';
import { cn } from '@/lib/utils';
import { ContainerDefaultProps } from '../_constants/layout';
import filterMargin from '../../../hooks/use-margin-padding';

export const Container = ({
	backgroundImage,
	width,
	children,
	...props
}: typeof ContainerDefaultProps & { children: React.ReactNode }) => {
	const {
		connectors: { connect, drag },
		id
	} = useNode();
	const { nodes } = useEditor((state) => state);
	const filteredArray = Object.entries(nodes)
		.filter((v) => v[1].data.props?.id !== 'no-drag')
		.map(([key, value]) => ({
			...value,
			uId: key
		}));
	const { hoveredNodeId } = useEditor((state) => ({
		hoveredNodeId: state.events
	}));
	const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;
	const { actions, ...rest } = useEditor((state) => ({
		hoveredNodeId: state.events
	}));
	const isSelected = id == Array.from(rest.hoveredNodeId.selected)[0];
	return (
		<>
			<style>{`
		.widContainer {
			width: calc(100% - ${props.padding}px);
			height: calc(100% - ${props.padding}px);
		}
		`}</style>
			<div
				{...props}
				ref={(ref) => {
					if (ref) {
						connect(drag(ref))
					}
				}}
				className={cn(
					'py-5 relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-y-auto shadow-md dark:shadow-lg min-h-96 mx-auto transition-all',
					isSelected && 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900'
				)}
				style={{
					width: `${width}px`,
					backgroundImage: `url(${backgroundImage})`,
					backgroundRepeat: 'round',
					padding: props.padding + 'px',
					borderRadius: filterMargin(props.borderRadius)

					// backgroundSize: 'cover',
				}}
				id="no-drag"
			// style={{ margin: '5px 0', background, padding: '10px 0 10px 0' }}
			>
				{filteredArray.length === 0 && (
					<div className="flex absolute flex-col flex-grow justify-center items-center rounded-md widContainer bg-gray-50/80 dark:bg-gray-900/80">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="32"
							height="32"
							viewBox="0 0 24 24"
							className="mb-2 text-gray-400 dark:text-gray-500"
						>
							<path
								fill="none"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M8 10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2zM4 4v.01M8 4v.01M12 4v.01M16 4v.01M4 8v.01M4 12v.01M4 16v.01"
							/>
						</svg>
						<p className="text-sm font-medium text-gray-600 dark:text-gray-300">Drag atoms here.</p>
					</div>
				)}
				{children}
			</div>
		</>
	);
};

export const ContainerSettings = () => {
	const config: ConfigItem[] = [
		{
			type: 'image',
			label: 'Background Image',
			property: 'backgroundImage',
			sizeLimit: 10000000,
			validFormats: ['image/gif', 'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/jpg']
		},
		{
			type: 'number',
			label: 'Width',
			property: 'width',
			options: {
				min: 0,
				max: 1000
			}
		},
		{
			type: 'number',
			label: 'Padding',
			property: 'padding',
			options: {
				min: 0,
				max: 500
			}
		},
		{
			type: 'spacing',
			label: 'Border Radius',
			property: 'borderRadius'
		}
	];
	return (
		<div>
			<EditBar config={config} />
		</div>
	);
};



Container.craft = {
	props: ContainerDefaultProps,

	related: {
		settings: ContainerSettings
	}
};
