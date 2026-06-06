import { Element, useEditor, useNode } from '@craftjs/core';
import { EditBar } from '../../editbar';
import { ConfigItem } from '../../../types';
import { ActiveLayoutBorder } from '../../active-border';
import { FlexLayoutDefaultProps } from '../_constants/layout';
import { margin } from '../config/common';
import filterMargin from '../../../hooks/use-margin-padding';
import { cn } from '@/lib/utils';

const FlexLayout = ({
	cols = 3,
	gap = 16,
	justifyContent = 'flex-start',
	alignItems = 'stretch',
	...props
}: typeof FlexLayoutDefaultProps & {
	gap?: number;
	justifyContent?: string;
	alignItems?: string;
}) => {
	const {
		connectors: { connect, drag },
		id
	} = useNode();

	const array = Array.from({ length: cols }).map((_, i) => i);

	return (
		<div className="flex flex-grow w-full" ref={(ref: any) => connect(drag(ref))}>
			<ActiveLayoutBorder active={false} id={id}>
				<div
					style={{
						margin: filterMargin(props.margin),
						gap: `${gap}px`,
						justifyContent,
						alignItems
					}}
					className="flex flex-grow p-4 !bg-gray-50/50 dark:!bg-gray-800/50 !border-2 !border-gray-200 dark:!border-gray-700 rounded-md"
				>
					{/* <div className="w-44 h-20 border rounded-md border-dashed"> */}
					{array.map((item, index) => (
						<Element
							key={index}
							// hoveredNodeName={JSON.stringify(hoveredNodeName)}
							item={item}
							uid={id}
							canvas
							is={FlexContainer}
							data-cy={item + 'item'}
							id={'flexchild' + item}
						>
							<div></div>
						</Element>
					))}
					{/* </div> */}
				</div>
			</ActiveLayoutBorder>
		</div>
	);
};

export const FlexContainer = ({
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
			className="min-h-[3rem] h-fit w-full p-2 overflow-hidden !bg-white dark:!bg-gray-900 !border-2 !border-dashed !border-gray-300 dark:!border-gray-600 rounded-md flex relative"
			id={item + 'no-drag'}
		>
			{children}
		</div>
	);
};

export default FlexLayout;
export const FlexLayoutSettings = () => {
	const configItem: ConfigItem[] = [
		{
			type: 'number',
			label: 'Columns',
			property: 'cols',
			options: {
				max: 12,
				min: 1
			}
		},
		{
			type: 'number',
			label: 'Gap (px)',
			property: 'gap',
			options: {
				min: 0,
				max: 128
			}
		},
		{
			type: 'select',
			label: 'Justify Content',
			property: 'justifyContent',
			list: [
				{ label: 'Start', value: 'flex-start' },
				{ label: 'Center', value: 'center' },
				{ label: 'End', value: 'flex-end' },
				{ label: 'Space Between', value: 'space-between' },
				{ label: 'Space Around', value: 'space-around' },
				{ label: 'Space Evenly', value: 'space-evenly' }
			]
		},
		{
			type: 'select',
			label: 'Align Items',
			property: 'alignItems',
			list: [
				{ label: 'Stretch', value: 'stretch' },
				{ label: 'Start', value: 'flex-start' },
				{ label: 'Center', value: 'center' },
				{ label: 'End', value: 'flex-end' },
				{ label: 'Baseline', value: 'baseline' }
			]
		},
		{ ...margin, label: 'Margin' }
	];
	return (
		<div>
			<EditBar config={configItem} />
		</div>
	);
};
FlexLayout.craft = {
	props: {
		...FlexLayoutDefaultProps,
		gap: 16,
		justifyContent: 'flex-start',
		alignItems: 'stretch'
	},
	related: {
		settings: FlexLayoutSettings
	}
};
