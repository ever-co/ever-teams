import { TeamsChart } from '@ever-teams/atoms';
import { useEditor, useNode } from '@craftjs/core';
import React from 'react';
import { ActiveBorder } from '../../active-border';
import { EditBar } from '../../editbar';
import { ConfigItem } from '../../../types';
interface IAreaChart {
	type: 'bar' | 'bar-horizontal' | 'area' | 'pie' | 'line' | 'radar' | 'radial' | 'tooltip';
	className: string;
}
export const BasicAreaChart = ({ ...props }: IAreaChart) => {
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
				<TeamsChart {...props} />
			</ActiveBorder>
		</div>
	);
};

const areaChartSettings = () => {
	const areaChartEditbar: ConfigItem[] = [
		{
			type: 'text',
			label: 'className',
			property: 'className'
		},
		{
			type: 'select',
			label: 'Type',
			property: 'type',
			list: [
				{
					value: 'area',
					label: 'Area'
				}
			]
		}
	];
	return (
		<>
			<EditBar config={areaChartEditbar} />
		</>
	);
};
export const areaChartProps = {
	className: ''
};

BasicAreaChart.craft = {
	props: areaChartProps,
	related: {
		settings: areaChartSettings
	}
};
