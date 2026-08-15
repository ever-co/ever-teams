import { useEditor, useNode } from '@craftjs/core';
import React, { useState } from 'react';
import { TeamsModernTimer as MTeams } from '@ever-teams/atoms';
import { ActiveBorder } from '../../active-border';
import { EditBar } from '../../editbar';
import { modernTeamsEditbarConfig } from '../config/timer';
import { ModernTeamsProps } from '../_constants/timer';

export const TeamsModernTimer = ({ separator, expandable, showProgress, ...props }: typeof ModernTeamsProps) => {
	const {
		id,
		connectors: { connect, drag }
	} = useNode();

	const { hoveredNodeId } = useEditor((state) => ({
		hoveredNodeId: state.events
	}));
	const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;

	return (
		<div style={{ alignItems: props.align }} className="flex w-full flex-col z-50 relative">
			<div
				ref={(ref) => {
					if (ref instanceof HTMLElement) {
						connect(drag(ref));
					}
				}}
				className="w-fit flex"
			>
				<ActiveBorder active={id == hoveredId} id={id}>
					<MTeams
						key={String(expandable)}
						className="w-fit"
						separator={separator}
						expandable={expandable}
						showProgress={showProgress}
					/>
				</ActiveBorder>
			</div>
		</div>
	);
};

export const ModernTeamsCompSettings = () => {
	return (
		<div className="space-y-4">
			<EditBar config={modernTeamsEditbarConfig} />
		</div>
	);
};

TeamsModernTimer.craft = {
	props: ModernTeamsProps,
	related: {
		settings: ModernTeamsCompSettings
	}
};
