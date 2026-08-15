import { useEditor, useNode } from '@craftjs/core';
import React from 'react';

import { TeamsMember } from '@ever-teams/atoms';
import { memberEditbarConfig } from '../../config/timer';
import { MemberVariantCardProps } from '../../_constants/timer';
import { EditBar } from '../../../editbar';
import { ActiveBorder } from '../../../active-border';

export const Members = ({ ...props }: typeof MemberVariantCardProps) => {
	const { className, showProgress, showTime, size } = props;
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
			ref={(ref) => {
				if (ref instanceof HTMLElement) {
					connect(drag(ref));
				}
			}}
			draggable={false}
		>
			<ActiveBorder active={id == hoveredId} id={id}>
				<TeamsMember
					seconds={0}
					className={className}
					showProgress={showProgress}
					showTime={showTime}
					size={'default'}
				/>
			</ActiveBorder>
		</div>
	);
};
const MembersSettings = () => {
	return <EditBar config={memberEditbarConfig} />;
};

Members.craft = {
	props: MemberVariantCardProps,
	related: {
		settings: MembersSettings
	}
};
