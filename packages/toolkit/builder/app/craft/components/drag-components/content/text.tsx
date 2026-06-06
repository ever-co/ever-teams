import { useEditor, useNode } from '@craftjs/core';
import React, { useState, useEffect } from 'react';
import ContentEditable from 'react-contenteditable';
import { EditBar } from '../../editbar';
import { ActiveBorder } from '../../active-border';
import { cn } from '@/lib/utils';
import { TextDefaultProps } from '../_constants/text';
import { titleEditbarConfig } from '../config/text';
import filterMargin from '../../../hooks/use-margin-padding';
export const Text = ({ text, fontSize, align, fontDecoration, opacity, ...props }: typeof TextDefaultProps) => {
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
	const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;
	return (
		<div
			{...props}
			className={cn('relative w-full z-50 flex')}
			ref={(ref) => {
				if (ref instanceof HTMLElement) {
					connect(drag(ref))
				}
			}}
			style={{ justifyContent: align, opacity: opacity / 100, fontWeight: props.fontWeight, color: props.color }}
			onClick={() => {
				actions.selectNode(id);
				selected && setEditable(true);
			}}
		>
			<ActiveBorder active={hoveredId == id} id={id}>
				<ContentEditable
					html={text}
					disabled={!editable}
					onChange={(e) =>
						setProp((props: any) => (props.text = e.target.value.replace(/<\/?[^>]+(>|$)/g, '')), 500)
					}
					tagName="p"
					style={{
						fontSize: `${fontSize}px`,
						margin: filterMargin(props.margin),
						padding: filterMargin(props.padding),
						...(fontDecoration == 'italic' && { fontStyle: 'italic' }),
						...(fontDecoration == 'bold' && { fontWeight: 'bold' }),
						...(fontDecoration == 'underline' && { textDecoration: 'underline' }),
						...(fontDecoration == 'none' && { textDecoration: 'none' })
					}}
				/>
			</ActiveBorder>
		</div>
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
			<EditBar config={titleEditbarConfig} />
		</>
	);
};

Text.craft = {
	props: TextDefaultProps,
	related: {
		settings: TextSettings
	}
};
