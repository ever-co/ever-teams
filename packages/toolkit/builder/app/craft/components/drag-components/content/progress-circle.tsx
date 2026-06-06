import { TeamsProgressCircle } from '@ever-teams/atoms';
import { useEditor, useNode } from '@craftjs/core';
import React from 'react';
import { ActiveBorder } from '../../active-border';
import { EditBar } from '../../editbar';
import { progressCircleVariantEditbarConfig } from '../config/timer';
import { ProgressCircleVariantProps } from '../_constants/timer';

export const BasicProgressCircle = ({ ...props }: typeof ProgressCircleVariantProps) => {
	const {
		id,
		connectors: { connect, drag }
	} = useNode();
	const { hoveredNodeId } = useEditor((state) => ({
		hoveredNodeId: state.events
	}));
	const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;

	return (
		<div style={{ alignItems: 'start' }} className="flex flex-col relative z-50">
			<div
				className="w-fit"
				ref={(ref) => {
					if (ref instanceof HTMLElement) {
						connect(drag(ref));
					}
				}}
			>
				<ActiveBorder active={id == hoveredId} id={id}>
					<TeamsProgressCircle {...props} />
				</ActiveBorder>
			</div>
		</div>
	);
};

const ProgressCircleSettings = () => {
	return (
		<>
			<EditBar config={progressCircleVariantEditbarConfig} />
		</>
	);
};

BasicProgressCircle.craft = {
	props: ProgressCircleVariantProps,
	related: {
		settings: ProgressCircleSettings
	}
};
