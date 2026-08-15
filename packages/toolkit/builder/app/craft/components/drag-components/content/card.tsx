import { useNode } from '@craftjs/core';
import React from 'react';

import { Button } from './button';
import { ContainerDefaultProps } from '../_constants/layout';
import { ContainerSettings } from '../layout/container';
import { Text } from '../content/text';

export const CardTop = ({ children, ...props }: { children: any }) => {
	const {
		connectors: { connect }
	} = useNode();

	return (
		<div
			{...props}
			ref={connect as any}
			className="text-only"
			style={{
				padding: '10px',
				marginBottom: '10px',
				borderBottom: '1px solid #eee',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start'
			}}
		>
			{children}
		</div>
	);
};

CardTop.craft = {
	rules: {
		canMoveIn: (incomingNodes: any) => {
			if (incomingNodes) {
				return incomingNodes.every((incomingNode: any) => incomingNode.data.type === Text)
			}
		}
	}
};

export const CardBottom = ({ children, ...props }: { children: React.ReactNode }) => {
	const {
		connectors: { connect }
	} = useNode();

	return (
		<div {...props} style={{ padding: '10px 0' }} ref={connect as any}>
			{children}
		</div>
	);
};

CardBottom.craft = {
	rules: {
		canMoveIn: (incomingNodes: any) => incomingNodes.every((incomingNode: any) => incomingNode.data.type === Button)
	}
};

export const Card = ({ background, padding = 20, ...props }: { background: string; padding: number }) => {
	return <></>;
};

Card.craft = {
	props: ContainerDefaultProps,
	related: {
		settings: ContainerSettings
	}
};
