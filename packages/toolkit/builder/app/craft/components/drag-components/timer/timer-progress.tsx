import { TeamsProgress } from '@ever-teams/atoms';
import { useEditor, useNode } from '@craftjs/core';
import { ActiveBorder } from '../../active-border';
import { TimerVariableProgressProps } from '../_constants/timer';
import { timerVariantProgressEditbarConfig } from '../config/timer';
import { EditBar } from '../../editbar';
import { ITeamsProgressProps } from '@ever-teams/toolkit-types';

export const TimerProgress = ({ ...props }: ITeamsProgressProps) => {
	const {
		id,
		connectors: { connect, drag }
	} = useNode();

	const { hoveredNodeId } = useEditor((state) => ({
		hoveredNodeId: state.events
	}));
	const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;

	return (
		<div
			className="w-fit"
			ref={(ref) => {
				if (ref instanceof HTMLElement) {
					connect(drag(ref));
				}
			}}
		>
			<ActiveBorder active={id == hoveredId} id={id}>
				<TeamsProgress {...props} />
			</ActiveBorder>
		</div>
	);
};

const TimerProgressSettings = () => {
	return (
		<>
			<EditBar config={timerVariantProgressEditbarConfig} />
		</>
	);
};

TimerProgress.craft = {
	props: TimerVariableProgressProps,
	related: {
		settings: TimerProgressSettings
	}
};
