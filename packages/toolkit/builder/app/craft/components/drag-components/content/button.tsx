import { useEditor, useNode } from '@craftjs/core';
import React from 'react';
import { Button as ShadcnButton } from '@/components/ui/button';
import { ActiveBorder } from '../../active-border';
import { EditBar } from '../../editbar';
import { ConfigItem } from '../../../types';

export const Button = ({
	variant,
	buttonSize,
	width,
	height,
	text,
	isLink,
	href,
	newTab,
	textColor,
	backgroundColor,
	borderRadius,
	...props
}: any) => {
	const {
		id,
		connectors: { connect, drag }
	} = useNode();

	const { hoveredNodeId } = useEditor((state) => ({
		hoveredNodeId: state.events
	}));
	const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;

	// Custom styling
	const customStyle: React.CSSProperties = {
		height: height + 'px',
		width: width + 'px',
		margin: props.margin + 'px',
		padding: props.padding + 'px'
	};

	// Add custom colors if provided
	if (textColor) customStyle.color = textColor;
	if (backgroundColor) customStyle.backgroundColor = backgroundColor;
	if (borderRadius) customStyle.borderRadius = borderRadius + 'px';

	// Button wrapper with active border
	const ButtonWrapper = (
		<div
			style={{
				height: height + 'px',
				width: width + 'px',
				margin: props.margin + 'px'
			}}
			ref={(ref) => {
				if (ref instanceof HTMLElement) {
					connect(drag(ref))
				}
			}}
			draggable={false}
		>
			<ActiveBorder active={id == hoveredId} id={id}>
				<ShadcnButton
					style={customStyle}
					variant={variant}
					size={buttonSize}
					asChild={isLink}
					{...props}
				>
					{isLink ? (
						<a
							href={href || '#'}
							target={newTab ? '_blank' : '_self'}
							rel={newTab ? 'noopener noreferrer' : undefined}
						>
							{text}
						</a>
					) : (
						text
					)}
				</ShadcnButton>
			</ActiveBorder>
		</div>
	);

	return ButtonWrapper;
};

export const ButtonSettings = () => {
	const {
		actions: { setProp },
		props
	} = useNode((node) => ({
		props: node.data.props
	}));

	// Main button properties
	const editbarConfig: ConfigItem[] = [
		{
			type: 'text',
			label: 'Button Text',
			property: 'text'
		},
		{
			type: 'number',
			property: 'width',
			label: 'Width',
			options: {
				min: 0,
				max: 1000
			}
		},
		{
			type: 'number',
			property: 'height',
			label: 'Height',
			options: {
				min: 0,
				max: 1000
			}
		},
		{
			type: 'divider',
			property: '',
			label: ''
		},
		{
			type: 'select',
			label: 'Variant',
			property: 'variant',
			list: [
				{ value: 'link', label: 'Link' },
				{ value: 'ghost', label: 'Ghost' },
				{ value: 'secondary', label: 'Secondary' },
				{ value: 'destructive', label: 'Destructive' },
				{ value: 'default', label: 'Default' },
				{ value: 'outline', label: 'Outline' }
			]
		},
		{
			type: 'divider',
			property: '',
			label: ''
		},
		{
			type: 'select',
			label: 'Size',
			property: 'buttonSize',
			list: [
				{ value: 'default', label: 'Default' },
				{ value: 'sm', label: 'Small' },
				{ value: 'lg', label: 'Large' },
				{ value: 'icon', label: 'Icon' }
			]
		}
	];

	// Link related properties
	const linkConfig: ConfigItem[] = [
		{
			type: 'divider',
			property: '',
			label: 'Link Settings'
		},
		{
			type: 'switch',
			label: 'Is Link',
			property: 'isLink'
		},
		{
			type: 'text',
			label: 'Link URL',
			property: 'href',
			condition: { key: 'isLink', value: true }
		},
		{
			type: 'switch',
			label: 'Open in New Tab',
			property: 'newTab',
			condition: { key: 'isLink', value: true }
		}
	];

	// Style related properties
	const styleConfig: ConfigItem[] = [
		{
			type: 'divider',
			property: '',
			label: 'Styling'
		},
		{
			type: 'color',
			label: 'Text Color',
			property: 'textColor'
		},
		{
			type: 'color',
			label: 'Background Color',
			property: 'backgroundColor'
		},
		{
			type: 'number',
			label: 'Border Radius',
			property: 'borderRadius',
			options: {
				min: 0,
				max: 50
			}
		},
		{
			type: 'number',
			label: 'Padding',
			property: 'padding',
			options: {
				min: 0,
				max: 100
			}
		},
		{
			type: 'number',
			label: 'Margin',
			property: 'margin',
			options: {
				min: 0,
				max: 100
			}
		}
	];

	return (
		<div>
			<EditBar config={editbarConfig.slice(0, 4)} />
			<EditBar config={editbarConfig.slice(4, 6)} />
			<EditBar config={editbarConfig.slice(6)} />
			<EditBar config={linkConfig} />
			<EditBar config={styleConfig} />
		</div>
	);
};

export const ButtonDefaultProps = {
	variant: 'default',
	buttonSize: 'default',
	text: 'Click me',
	height: 42,
	width: 120,
	padding: 0,
	margin: 0,
	isLink: false,
	href: '',
	newTab: false,
	textColor: '',
	backgroundColor: '',
	borderRadius: ''
};

Button.craft = {
	props: ButtonDefaultProps,
	related: {
		settings: ButtonSettings
	}
};
