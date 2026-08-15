import { cn } from '@/lib/utils';
import { useEditor, useNode } from '@craftjs/core';
import { usePathname } from 'next/navigation';
import React, { HTMLAttributes, useRef, useState } from 'react';
import { atom, useAtom } from 'jotai';
import Image from 'next/image';

export const disableAtom = atom(false);

export const ActiveBorder = ({
	active,
	children,
	id,
	style,
	...props
}: {
	active: boolean;
	children: React.ReactNode;
	id?: string;
	resizable?: boolean;
	height?: number;
	width?: number;
	style?: HTMLAttributes<HTMLSpanElement>['style'];
}) => {
	const { actions, ...rest } = useEditor((state) => ({
		hoveredNodeId: state.events
	}));

	const [disable, setDisable] = useAtom(disableAtom);
	const [hovered, setHovered] = useState(false);
	const path = usePathname();
	const isSelected = id == Array.from(rest.hoveredNodeId.selected)[0];
	const [size, setSize] = useState({ width: props.width, height: 200 });
	const resizableRef: any = useRef(null);
	const isResizing = useRef(false);
	const node = useNode((node) => node);

	const onChange = (property: string, value: any) => {
		return node.actions.setProp((props: any) => (props[property] = value), 1000);
	};

	const { nodes } = useEditor((state) => ({
		nodes: state.nodes,
		state: state
	}));

	const allNodes = Object.entries(nodes)
		// .filter((v) => v[1].data.props?.id !== 'no-drag')
		.map(([key, value]) => ({
			...value,
			uId: key
		}));

	const rootNode = allNodes.find((v) => v.uId === 'ROOT');

	// Start resizing on mousedown
	const handleMouseDown = () => {
		isResizing.current = true;
		// setDisable(true); // Set disable to true when starting to drag
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	};

	// Handle mousemove event
	const handleMouseMove = (e: any) => {
		if (isResizing.current) {
			const newWidth = e.clientX - resizableRef.current.getBoundingClientRect().left;
			const newHeight = e.clientY - resizableRef.current.getBoundingClientRect().top;
			setSize({
				width: newWidth,
				height: Number(newHeight)
			});
			// if (rootNode?.data?.props?.width > newWidth) {
			// if
			onChange('width', Number(newWidth.toString().split('.')[0]));
			onChange('height', Number(newHeight.toString().split('.')[0]));
			// }
		}
	};

	// Stop resizing on mouseup
	const handleMouseUp = () => {
		isResizing.current = false;
		// setDisable(false); // Set disable back to false after dragging
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
	};

	// props.resizable
	return (
		<div
			style={{
				...(props.resizable && {
					width: `${size.width}px`,
					height: `${size.height}px`,
					maxHeight: rootNode?.data?.props?.width + 'px'
				}),
				...style
			}}
			ref={props.resizable ? resizableRef : null}
			className={cn(
				'border relative cursor-pointer w-fit',
				active || isSelected ? 'border-blue-500' : 'border-transparent',
				path.includes('preview') ? 'border-transparent' : ''
			)}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			{disable}
			{props.resizable && isSelected && !path.includes('preview') && (
				<div className="-right-4 -bottom-4 w-10 h-10 border absolute">
					<div
						className="  cursor-move z-[var(--z-modal)]"
						onMouseEnter={() => {
							setDisable(true);
						}}
						onMouseLeave={() => {
							setDisable(false);
						}}
						onMouseDown={handleMouseDown}
					>
						<Image
							className="w-5 h-5"
							src="https://api.iconify.design/lets-icons:resize-down-right.svg?color=blue"
							alt=""
						/>
					</div>
				</div>
			)}
			{isSelected && !path.includes('preview') && (
				<span
					onClick={() => actions.delete(id ?? '')}
					className="bg-blue-500 h-5 w-4 absolute -right-[1px] top z-50"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="mt-0.5"
						width="16"
						height="16"
						viewBox="0 0 24 24"
					>
						<path
							fill="#fff"
							d="M5 21V6H4V4h5V3h6v1h5v2h-1v15zm2-2h10V6H7zm2-2h2V8H9zm4 0h2V8h-2zM7 6v13z"
						/>
					</svg>
				</span>
			)}
			{children}
		</div>
	);
};

export const ActiveLayoutBorder = ({
	active,
	children,
	id
}: {
	active: boolean;
	children: React.ReactNode;
	id?: string;
}) => {
	const { actions, ...rest } = useEditor((state) => ({
		hoveredNodeId: state.events
	}));
	const path = usePathname();

	const isSelected = id == Array.from(rest.hoveredNodeId.selected)[0];
	return (
		<div
			className={cn(
				'border relative cursor-pointer w-full ',
				active || isSelected ? 'border-blue-500' : 'border-transparent',
				path.includes('preview') ? 'border-transparent' : ''
			)}
		>
			{(active || isSelected) && (
				<span
					onClick={() => actions.delete(id ?? '')}
					className="bg-blue-500 h-5 w-4 absolute -right-[1px] top z-50"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="mt-0.5"
						width="16"
						height="16"
						viewBox="0 0 24 24"
					>
						<path
							fill="#fff"
							d="M5 21V6H4V4h5V3h6v1h5v2h-1v15zm2-2h10V6H7zm2-2h2V8H9zm4 0h2V8h-2zM7 6v13z"
						/>
					</svg>
				</span>
			)}
			{children}
		</div>
	);
};
