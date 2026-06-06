import { useEditor, useNode } from '@craftjs/core';
import React, { useState, useEffect } from 'react';
import { EditBar } from '../../editbar';
import { ActiveBorder } from '../../active-border';
import { cn } from '@/lib/utils';
import { LinkDefaultProps } from '../_constants/text';
import { linkEditbarConfig } from '../config/text';
import { usePathname } from 'next/navigation';
import filterMargin from '../../../hooks/use-margin-padding';
export const Link = ({
	text = 'link',
	fontSize,
	align,
	fontDecoration,
	opacity,
	color,
	hoverColor,
	visitedColor,
	...props
}: typeof LinkDefaultProps) => {
	const pathname = usePathname();

	const {
		connectors: { connect, drag },
		selected,
		id,
		actions: { setProp }
	} = useNode((state) => ({
		selected: state.events.selected,
		dragged: state.events.dragged
	}));
	const { actions } = useEditor();

	const [editable, setEditable] = useState(false);

	useEffect(() => {
		if (selected) {
			return;
		}

		setEditable(false);
	}, [selected]);
	const { hoveredNodeId } = useEditor((state) => ({
		hoveredNodeId: state.events
	}));
	// useHover
	const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;
	return (
		<>
			<style>{`
				.colorStyle:hover {
					color: ${hoverColor} !important;
				}
				.colorStyle:visited {
					color: ${visitedColor} !important;
				}
			`}</style>
			<div
				{...props}
				className={cn('relative w-full z-50 flex')}
				ref={(ref) => {
					if (ref instanceof HTMLElement) {
						connect(drag(ref));
					}
				}}
				style={{ justifyContent: align, opacity: opacity / 100 }}
				onClick={() => {
					actions.selectNode(id);
					selected && setEditable(true);
				}}
			>
				<ActiveBorder active={hoveredId == id} id={id}>
					<a
						href={pathname == '/craft' ? '#' : props.href}
						target={props.openInNewTab ? '_blank' : '_self'}
						onChange={({ target }: any) =>
							setProp((props: any) => (props.text = target.value.replace(/<\/?[^>]+(>|$)/g, '')), 500)
						}
						className="colorStyle"
						style={{
							fontSize: `${fontSize}px`,
							margin: filterMargin(props.margin),
							padding: filterMargin(props.padding),
							...(fontDecoration == 'italic' && { fontStyle: 'italic' }),
							...(fontDecoration == 'bold' && { fontWeight: 'bold' }),
							...(fontDecoration == 'underline' && { textDecoration: 'underline' }),
							...(fontDecoration == 'none' && { textDecoration: 'none' }),
							color: color
						}}
					>
						{text}
					</a>
				</ActiveBorder>
			</div>
		</>
	);
};
const TextSettings = () => {
	const {
		actions: { setProp }
	} = useNode((node) => ({
		text: node.data.props.text,
		fontSize: node.data.props.fontSize
	}));
	return (
		<>
			<EditBar config={linkEditbarConfig} />
		</>
	);
};

Link.craft = {
	props: LinkDefaultProps,
	related: {
		settings: TextSettings
	}
};
