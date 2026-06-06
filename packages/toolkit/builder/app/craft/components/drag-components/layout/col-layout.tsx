import { Element, useEditor, useNode } from '@craftjs/core';
import { EditBar } from '../../editbar';
import { ConfigItem } from '../../../types';
import { ActiveLayoutBorder } from '../../active-border';
import { ColLayoutDefaultProps } from '../_constants/layout';
import { margin } from '../config/common';
import filterMargin from '../../../hooks/use-margin-padding';

const ColLayout = ({ rows = 3, ...props }: typeof ColLayoutDefaultProps) => {
	const {
		connectors: { connect, drag },
		id
	} = useNode();

	const array = Array.from({ length: rows }).map((_, i) => i);
	return (
		<div className="flex flex-grow w-full" ref={(ref) => {
			if (ref instanceof HTMLElement) {
				connect(drag(ref))
			}
		}}>
			<ActiveLayoutBorder active={false} id={id}>
				<div
					style={{
						margin: filterMargin(props.margin)
					}}
					className="flex flex-col flex-grow p-1 border justify-between"
				>
					{array.map((item, index) => (
						<Element
							key={index}
							item={item}
							uid={id}
							canvas
							is={ColContainer}
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

export const ColContainer = ({
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
			ref={(ref: any) => connect(drag(ref))}
			className="min-h-10 flex-grow overflow-hidden h-fit p-0.5 w-full border border-dashed border-gray-600 flex relative "
			id={item + 'no-drag'}
		>
			{children}
		</div>
	);
};

export default ColLayout;
export const ColLayoutSettings = () => {
	const configItem: ConfigItem[] = [
		{
			type: 'number',
			label: 'Rows',
			property: 'rows',
			options: {
				max: 12,
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

ColLayout.craft = {
	props: ColLayoutDefaultProps,
	related: {
		settings: ColLayoutSettings
	}
};
