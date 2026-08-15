import { TeamsButton } from '@ever-teams/atoms';
import { useEditor, useNode } from '@craftjs/core';
import { ActiveBorder } from '../../active-border';
import { timerVariantButtonEditbarConfig } from '../config/timer';
import { TimerVariantButtonProps } from '../_constants/timer';
import { EditBar } from '../../editbar';

interface IBasicTeamsButton {
	size: 'default' | 'sm' | 'lg';
}
export const TimerButton = ({ size }: IBasicTeamsButton) => {
	const {
		id,
		connectors: { connect, drag }
	} = useNode();

	const { hoveredNodeId } = useEditor((state) => ({
		hoveredNodeId: state.events
	}));
	const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;

	return (
		<div style={{ alignItems: 'start' }} className="flex flex-col w-full relative z-50">
			<div
				className="w-fit"
				ref={(ref) => {
					if (ref instanceof HTMLElement) {
						connect(drag(ref));
					}
				}}
			>
				<ActiveBorder active={id == hoveredId} id={id}>
					<TeamsButton
						isRunning={false}
						startTimer={() => Promise.resolve()}
						stopTimer={() => Promise.resolve()}
						timerLoading={false}
						size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
					/>
				</ActiveBorder>
			</div>
		</div>
	);
};

const TimerButtonSettings = () => {
	return (
		<>
			<EditBar config={timerVariantButtonEditbarConfig} />
		</>
	);
};

TimerButton.craft = {
	props: TimerVariantButtonProps,
	related: {
		settings: TimerButtonSettings
	}
};
