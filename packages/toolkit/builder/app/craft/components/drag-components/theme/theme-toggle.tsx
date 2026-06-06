import { TeamsThemeToggle } from '@ever-teams/atoms';
import React from 'react';
import { ActiveBorder } from '../../active-border';
import { useEditor, useNode } from '@craftjs/core';

export function BasicThemeToggle() {
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
				<TeamsThemeToggle />
			</ActiveBorder>
		</div>
	);
}
