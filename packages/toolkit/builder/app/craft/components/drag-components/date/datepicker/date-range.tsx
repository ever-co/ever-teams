import React from 'react';
import { TeamsDateRangePicker } from '@ever-teams/atoms';
import { IDateRangePickerProps } from '@ever-teams/toolkit-types';
import { ActiveBorder } from '../../../active-border';
import { useEditor, useNode } from '@craftjs/core';
import { EditBar } from '../../../editbar';
import { ConfigItem } from '../../../../types';

export const BasicDateRanger = ({ ...props }: IDateRangePickerProps) => {
	const {
		id,
		connectors: { connect, drag }
	} = useNode();
	const { hoveredNodeId } = useEditor((state) => ({ hoveredNodeId: state.events }));
	const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;

	return (
		<div
			ref={(ref) => {
				if (ref instanceof HTMLLIElement) {
					connect(drag(ref));
				}
			}}
			draggable={false}
		>
			<ActiveBorder active={id == hoveredId} id={id}>
				<TeamsDateRangePicker {...props} />
			</ActiveBorder>
		</div>
	);
};

const DateRangeSettings = () => {
	const DateRangeEdit: ConfigItem[] = [
		{
			type: 'text',
			label: 'ClassName',
			property: 'className'
		}
	];

	return (
		<div>
			<EditBar config={DateRangeEdit} />
		</div>
	);
};

export const BasicDateRangeProps = {
	className: 'bg-white'
};
BasicDateRanger.craft = {
	props: BasicDateRangeProps,
	related: {
		settings: DateRangeSettings
	}
};
