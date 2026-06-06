import { useEditor, useNode } from '@craftjs/core';
import React from 'react';
import { EditBar } from '../../editbar';
import { ActiveBorder } from '../../active-border';
import { cn } from '@/lib/utils';
import { ImageDefaultProps } from '../_constants/media';
import { imageEditbarConfig } from '../config/media';
import filterMargin from '../../../hooks/use-margin-padding';
import NextImage from 'next/image';

export const Image = ({ src, width, height, objectFit, opacity, ...props }: typeof ImageDefaultProps) => {
	const {
		connectors: { connect },
		id
	} = useNode((state) => ({
		selected: state.events.selected,
		dragged: state.events.dragged
	}));
	const { actions } = useEditor();

	const { hoveredNodeId } = useEditor((state) => ({
		hoveredNodeId: state.events
	}));
	const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;

	return (
		<div
			className={cn('relative w-full z-50 flex')}
			aria-disabled
			ref={(ref) => {
				if (ref instanceof HTMLElement) {
					connect(ref);
				}
			}}
			style={{ justifyContent: props.align, opacity: opacity / 100 }}
			onClick={() => {
				actions.selectNode(id);
			}}
		>
			<ActiveBorder resizable height={height} width={width} active={hoveredId == id} id={id}>
				{src ? (
					<NextImage
						src={src}
						alt={'Image'}
						width={width}
						height={height}
						style={{
							objectFit: objectFit as any,
							margin: filterMargin(props.margin) ?? '0px'
						}}
					/>
				) : (
					<div
						style={{
							width: `${width}px`,
							height: `${height}px`,
							objectFit: objectFit as any,
							margin: filterMargin(props.margin)
						}}
						className="border cursor-move flex justify-center items-center w-56 h-56 bg-blue-100/20 rounded-md"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256">
							<path
								fill="blue"
								d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m-60 48a12 12 0 1 1-12 12a12 12 0 0 1 12-12m60 112H40v-39.31l46.34-46.35a8 8 0 0 1 11.32 0L165 181.66a8 8 0 0 0 11.32-11.32l-17.66-17.65L173 138.34a8 8 0 0 1 11.31 0L216 170.07z"
							/>
						</svg>
					</div>
				)}
			</ActiveBorder>
		</div>
	);
};

const ImageSettings = () => {
	return (
		<>
			<EditBar config={imageEditbarConfig} />
		</>
	);
};

Image.craft = {
	props: ImageDefaultProps,
	related: {
		settings: ImageSettings
	}
};
