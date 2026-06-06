import { useEditor, useNode } from '@craftjs/core';
import React, { useState, useEffect } from 'react';
import { EditBar } from '../../editbar';
import { ActiveBorder } from '../../active-border';
import { cn } from '@/lib/utils';
import { ParagraphDefaultProps } from '../_constants/text';
import { paragraphEditbarConfig } from '../config/text';
import { TextDefaultProps } from '../_constants/text';
import filterMargin from '../../../hooks/use-margin-padding';
import useSelectedNextAtom from '../../../hooks/use-selected-next-atom';

interface ParagraphProps {
	text: string;
	fontSize?: number;
	fontWeight?: string;
	color?: string;
	width?: number;
	height?: number;
	lineHeight?: number;
	opacity?: number;
	fontDecoration?: string;
	align?: string;
	margin?: any;
	padding?: any;
	className?: string;
}

export const Paragraph = ({
	text,
	fontSize,
	fontWeight,
	color,
	width,
	height,
	lineHeight,
	opacity,
	fontDecoration,
	align,
	margin,
	padding,
	className,
}: ParagraphProps) => {
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
	// const isRoot = queryNode(id).childNodes();
	// console.log(edd, 'nodevnode1');
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
	const { disabledId } = useSelectedNextAtom();
	// actions.

	// Combine the component's styling classes with any provided className
	const paragraphClass = `${className || ''} ${align ? `text-${align}` : ''} ${fontDecoration ? `text-${fontDecoration}` : ''}`.trim();

	return (
		// <ResizableComponent>
		<div
			// {...props}
			className={cn('relative z-50 flex')}
			ref={(ref) => {
				if (ref instanceof HTMLElement) {
					disabledId == id ? connect(ref) : connect(drag(ref))
				}
			}}
			style={{
				justifyContent: align,
				opacity: opacity !== undefined ? opacity / 100 : 1,
				fontWeight: fontWeight,
				color,
				width: width ? `${width}px` : undefined,
				height: height ? `${height}px` : undefined,
				lineHeight,
				// backgroundColor: disabledId == id ? 'red' : 'transparent'
				...(margin && {
					marginTop: `${margin.t}px`,
					marginRight: `${margin.r}px`,
					marginBottom: `${margin.b}px`,
					marginLeft: `${margin.l}px`,
				}),
				...(padding && {
					paddingTop: `${padding.t}px`,
					paddingRight: `${padding.r}px`,
					paddingBottom: `${padding.b}px`,
					paddingLeft: `${padding.l}px`,
				}),
			}}
			onClick={() => {
				actions.selectNode(id);
				selected && setEditable(true);
			}}
		>
			{/* {disabledId ?  */}
			{/* <div className="w-fit absolute bg-blue-500 z-[100000] w-relative">disabled</div> */}
			{/* //  : null} */}
			<ActiveBorder resizable width={200} height={200} active={hoveredId == id} id={id}>
				<p
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setProp((props: any) => (props.text = e.target?.value.replace(/<\/?[^>]+(>|$)/g, '')), 500)
					}
					className={paragraphClass}
					style={{
						fontSize: fontSize ? `${fontSize}px` : undefined,
						lineHeight,
						...(fontDecoration == 'italic' && { fontStyle: 'italic' }),
						...(fontDecoration == 'bold' && { fontWeight: 'bold' }),
						...(fontDecoration == 'underline' && { textDecoration: 'underline' }),
						...(fontDecoration == 'none' && { textDecoration: 'none' })
					}}
				>
					{text}
				</p>
			</ActiveBorder>
		</div>
		// </ResizableComponent>
	);
};
const ParagraphSetting = () => {
	const {
		actions: { setProp }
	} = useNode((node) => ({
		text: node.data.props.text,
		fontSize: node.data.props.fontSize
	}));
	return (
		<>
			<EditBar config={paragraphEditbarConfig} />
		</>
	);
};

Paragraph.craft = {
	props: {
		...TextDefaultProps,
		className: '', // Add a default empty className
	},
	related: {
		settings: ParagraphSetting
	}
};
