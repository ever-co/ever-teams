import { useEditor, useNode } from '@craftjs/core';
import React from 'react';
import { TeamsEssentialTimer } from '@ever-teams/atoms';
import { ActiveBorder } from '../../active-border';
import { EditBar } from '../../editbar';
import { teamsEssentialTimerEditbarConfig } from '../config/timer';
import { TeamsEssentialTimerProps } from '../_constants/timer';

export const TeamsEssentialTimerComp = ({ ...props }: typeof TeamsEssentialTimerProps) => {
	const {
		id,
		connectors: { connect, drag }
	} = useNode();

	const { hoveredNodeId } = useEditor((state) => ({
		hoveredNodeId: state.events
	}));
	const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;
	return (
		<div style={{ alignItems: props.align }} className="flex flex-col w-full relative z-50">
			<div
				className="w-fit"
				ref={(ref) => {
					if (ref instanceof HTMLElement) {
						connect(drag(ref));
					}
				}}
			>
				<ActiveBorder active={id == hoveredId} id={id}>
					<TeamsEssentialTimer {...props}></TeamsEssentialTimer>
				</ActiveBorder>
			</div>
		</div>
	);
};

export const TeamsEssentialTimerCompSettings = () => {
	return (
		<div>
			<EditBar config={teamsEssentialTimerEditbarConfig} />
		</div>
	);
};

TeamsEssentialTimerComp.craft = {
	props: TeamsEssentialTimerProps,
	related: {
		settings: TeamsEssentialTimerCompSettings
	}
};
