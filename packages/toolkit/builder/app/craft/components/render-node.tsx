import { useNode, useEditor } from '@craftjs/core';
import { ROOT_NODE } from '@craftjs/utils';
import React, { useEffect, useRef, useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import '../../globals.css';
import { IconArrow, IconMove, IconTrash } from '.';

const IndicatorDiv = styled.div`
	height: 30px;
	margin-top: -29px;
	font-size: 12px;
	line-height: 12px;

	svg {
		fill: #fff;
		width: 15px;
		height: 15px;
	}
`;

const Btn = styled.a`
	padding: 0 0px;
	opacity: 0.9;
	display: flex;
	align-items: center;
	> div {
		position: relative;
		top: -50%;
		left: -50%;
	}
`;

export const RenderNode = ({ render }: any) => {
	const { id } = useNode();
	const { actions, query, isActive } = useEditor((_, query) => ({
		isActive: query.getEvent('selected').contains(id)
	}));

	const {
		isHover,
		dom,
		name,
		moveable,
		deletable,
		connectors: { drag },
		parent
	} = useNode((node) => ({
		isHover: node.events.hovered,
		dom: node.dom,
		name: node.data.custom.displayName || node.data.displayName,
		moveable: query.node(node.id).isDraggable(),
		deletable: query.node(node.id).isDeletable(),
		parent: node.data.parent,
		props: node.data.props
	}));

	const currentRef = useRef<HTMLDivElement>(null);
	const [pageContainer, setPageContainer] = useState<HTMLElement | null>(null);

	useEffect(() => {
		if (dom) {
			if (isActive || isHover) dom.classList.add('component-selected');
			else dom.classList.remove('component-selected');
		}
	}, [dom, isActive, isHover]);

	const getPos = useCallback((dom: HTMLElement) => {
		const { top, left, bottom } = dom ? dom.getBoundingClientRect() : { top: 0, left: 0, bottom: 0 };
		return {
			top: `${top > 0 ? top : bottom}px`,
			left: `${left}px`
		};
	}, []);

	const scroll = useCallback(() => {
		const { current: currentDOM } = currentRef;

		if (!currentDOM) return;
		const { top, left } = getPos(dom as any);
		currentDOM.style.top = top;
		currentDOM.style.left = left;
	}, [dom, getPos]);

	useEffect(() => {
		const craftRenderer = document.querySelector('.craftjs-renderer');
		craftRenderer?.addEventListener('scroll', scroll);
		if (typeof document !== 'undefined') {
			const container = document.querySelector('.page-container') as HTMLElement | null;
			setPageContainer(container);
		}
		return () => {
			craftRenderer?.removeEventListener('scroll', scroll);
		};
	}, [scroll]);

	return (
		<>
			{(isHover || isActive) && pageContainer
				? ReactDOM.createPortal(
					<IndicatorDiv
						ref={currentRef as any}
						className="px-2 py-2 text-white bg-blue-500 fixed flex items-center"
						style={{
							left: getPos(dom!).left,
							top: getPos(dom!).top,
							zIndex: 9999
						}}
					>
						<h2 className="flex-1 mr-4">{name}</h2>
						{moveable ? (
							<Btn className="mr-2 cursor-move" ref={drag as any}>
								<IconMove />
							</Btn>
						) : null}
						{id !== ROOT_NODE && (
							<Btn
								className="mr-2 cursor-pointer"
								onClick={() => {
									actions.selectNode(parent as any);
								}}
							>
								<IconArrow />
							</Btn>
						)}
						{deletable ? (
							<Btn
								className="cursor-pointer"
								onMouseDown={(e: React.MouseEvent) => {
									e.stopPropagation();
									actions.delete(id);
								}}
							>
								<IconTrash />
							</Btn>
						) : null}
					</IndicatorDiv>,
					pageContainer
				)
				: null}
			{render}
		</>
	);
};
