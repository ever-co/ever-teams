import { TeamsChart } from '@ever-teams/atoms';
import { useEditor, useNode } from '@craftjs/core';
import { ActiveBorder } from '../../active-border';

export function BasicTooltipChart() {
	const {
		id,
		connectors: { connect, drag }
	} = useNode();
	const { hoveredNodeId } = useEditor((state) => ({ hoveredNodeId: state.events }));
	const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;
	return (
		<div
			ref={(ref) => {
				if (ref instanceof HTMLElement) {
					connect(drag(ref));
				}
			}}
			draggable={false}
		>
			<ActiveBorder active={id == hoveredId} id={id}>
				<TeamsChart type="tooltip" className="w-full" />
			</ActiveBorder>
		</div>
	);
}
