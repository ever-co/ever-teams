import { useEditor, useNode } from '@craftjs/core';
import { ActiveBorder } from '../../active-border';
import { TeamsChart } from '@ever-teams/atoms';
import { EditBar } from '../../editbar';
import { ConfigItem } from '../../../types';

interface ITeamsBasicReportProps {
	type?: 'bar' | 'bar-horizontal' | 'area' | 'pie' | 'line' | 'radar' | 'radial' | 'tooltip';
	className?: string | undefined;
}
export const TeamsChartComponent = ({ ...props }: ITeamsBasicReportProps) => {
	const {
		id,
		connectors: { connect, drag }
	} = useNode();
	const { hovedNodeId } = useEditor((state) => ({ hovedNodeId: state.events }));
	const hoveredId = hovedNodeId ? Array.from(hovedNodeId.hovered)[0] : null;

	return (
		<div
			ref={(ref) => {
				if (ref instanceof HTMLElement) {
					connect(drag(ref));
				}
			}}
		>
			<ActiveBorder active={id == hoveredId} id={id}>
				{<TeamsChart type={props.type ?? 'line'}></TeamsChart>}
			</ActiveBorder>
		</div>
	);
};

export const TeamsBasicRapportSettings = () => {
	const editorConfig: ConfigItem[] = [
		{
			property: 'type',
			label: 'Chart Type',
			type: 'select',
			list: [
				{
					label: 'Bar',
					value: 'bar'
				},
				{
					label: 'Area',
					value: 'area'
				},
				{
					label: 'Pie',
					value: 'pie'
				},
				{
					label: 'Line',
					value: 'line'
				},
				{
					label: 'Radar',
					value: 'radar'
				},
				{
					label: 'Radial',
					value: 'radial'
				},
				{
					label: 'Tooltip',
					value: 'tooltip'
				}
			]
		}
	];

	return (
		<div>
			<EditBar config={editorConfig} />
		</div>
	);
};

export const TeamsBasicRapportProps = {
	type: 'bar'
};

TeamsChartComponent.craft = {
	props: TeamsBasicRapportProps,
	related: {
		settings: TeamsBasicRapportSettings
	}
};
