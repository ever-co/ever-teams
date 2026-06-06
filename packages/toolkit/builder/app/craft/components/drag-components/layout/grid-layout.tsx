import { Element, useEditor, useNode } from '@craftjs/core';
import { EditBar } from '../../editbar';
import { ConfigItem } from '../../../types';
import { ActiveLayoutBorder } from '../../active-border';
import { GridDefaultProps } from '../_constants/layout';
import { margin } from '../config/common';
import filterMargin from '../../../hooks/use-margin-padding';

const GridLayout = ({ cols, rows, gap, ...props }: typeof GridDefaultProps) => {
	const {
		connectors: { connect, drag },
		id
	} = useNode();

	const array = Array.from({ length: cols * rows }).map((_, i) => i);
	return (
		<div className="flex flex-grow w-full" ref={(ref: any) => connect(drag(ref))}>
			<ActiveLayoutBorder active={false} id={id}>
				<div
					style={{
						gridTemplateColumns: `repeat(${cols}, 1fr)`,
						gridTemplateRows: `repeat(${rows}, 1fr)`,
						gap: gap,
						margin: filterMargin(props.margin)
					}}
					className="grid flex-grow p-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md justify-between"
				>
					{array.map((item, index) => (
						<Element
							key={index}
							item={item}
							uid={id}
							canvas
							is={GridContainer}
							data-cy={item + 'item'}
							id={item + 'no-drag'}
						>
							<div></div>
						</Element>
					))}
				</div>
			</ActiveLayoutBorder>
		</div>
	);
};

export const GridContainer = ({
	item,
	uid,
	children,
	...props
}: {
	uid: string;
	item: number;
	children: React.ReactNode;
}) => {
	const {
		connectors: { connect, drag }
	} = useNode();
	const { activeHoverdData, actions } = useEditor((state: any) => {
		const currentlyHoveredId: any = state.events.hovered;
		return {
			activeHoverdData: state.nodes[Array.from(currentlyHoveredId)[0] as number]
		};
	});
	return (
		<div
			{...props}
			onClick={() => {
				if (activeHoverdData?.id == uid || activeHoverdData?.data?.parent == uid) {
					actions.selectNode(uid);
				}
			}}
			onMouseDown={() => {
				if (activeHoverdData?.id == uid || activeHoverdData?.data?.parent == uid) {
					actions.selectNode(uid);
				}
			}}
			ref={(ref) => {
				if (ref instanceof HTMLElement) {
					connect(drag(ref))
				}
			}}
			className="min-h-10 overflow-hidden flex-grow h-fit p-2 w-full bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-600 rounded-md flex relative"
			id={item + 'no-drag'}
		>
			{children}
		</div>
	);
};

export default GridLayout;
export const GridLayoutSettings = () => {
	const configItem: ConfigItem[] = [
		{
			type: 'number',
			label: 'Column',
			property: 'cols',
			options: {
				max: 12,
				min: 0
			}
		},
		{
			type: 'number',
			label: 'Rows',
			property: 'rows',
			options: {
				max: 12,
				min: 0
			}
		},
		{
			type: 'number',
			label: 'Gap',
			property: 'gap',
			options: {
				max: 50,
				min: 0
			}
		},
		margin
	];
	return (
		<div>
			<EditBar config={configItem} />
		</div>
	);
};

GridLayout.craft = {
	props: GridDefaultProps,
	related: {
		settings: GridLayoutSettings
	}
};
