import React from 'react';
import { Calendar } from '@ever-teams/toolkit-ui';
import { CalendarProps } from '@ever-teams/toolkit-types';
import { useEditor, useNode } from '@craftjs/core';
import { ActiveBorder } from '../../active-border';
import { EditBar } from '../../editbar';
import { calendarDefaultProps } from '../_constants/form';
import { calendarEditbarConfig } from '../config/form';

export const BasicCalendar = ({ ...props }: typeof calendarDefaultProps) => {
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
				<Calendar
					className={props.className}
					showOutsideDays={props.showOutsideDays}
				/>
			</ActiveBorder>
		</div>
	);
};

const CalendarSettings = () => {
	return (
		<>
			<EditBar config={calendarEditbarConfig} />
		</>
	);
};

export const calendarProps = {
	className: 'bg-[#F8F8FF] dark:bg-[#1E2025]'
};

BasicCalendar.craft = {
	props: calendarDefaultProps,
	related: {
		settings: CalendarSettings
	}
};
