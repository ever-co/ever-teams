import React from 'react';
import { TeamsDatePicker } from '@ever-teams/atoms';
import { IDatePickerProps } from '@ever-teams/toolkit-types';
import { ActiveBorder } from '../../../active-border';
import { useEditor, useNode } from '@craftjs/core';
import { EditBar } from '../../../editbar';
import { ConfigItem } from '../../../../types';

export const BasicDatePicker = ({ ...props }: IDatePickerProps) => {
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
				<TeamsDatePicker {...props} />
			</ActiveBorder>
		</div>
	);
};

const DatePickerSettings = () => {
	const DatePickerEdit: ConfigItem[] = [
		{
			type: 'text',
			label: 'Placeholder',
			property: 'placeholder'
		},
		{
			type: 'switch',
			label: 'Icon',
			property: 'icon'
		},
		{
			type: 'text',
			label: 'ClassName',
			property: 'className'
		}
	];

	return (
		<div>
			<EditBar config={DatePickerEdit} />
		</div>
	);
};

export const BasicDatePickerProps = {
	placeholder: 'Select the date',
	icon: true,
	className: 'bg-white'
};
BasicDatePicker.craft = {
	props: BasicDatePickerProps,
	related: {
		settings: DatePickerSettings
	}
};
