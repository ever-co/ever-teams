import React, { useState, useRef } from 'react';
import Image from 'next/image';

const ResizableComponent = ({ children }: { children: React.ReactNode }) => {
	const [size, setSize] = useState({ width: 600, height: 200 });
	const resizableRef = useRef<HTMLDivElement | null>(null);
	const isResizing = useRef(false);

	// Start resizing on mousedown
	const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		isResizing.current = true;
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	  };

	// Handle mousemove event
	const handleMouseMove = (e: MouseEvent) => {
		if (isResizing.current && resizableRef.current) {
			const newWidth = e.clientX - resizableRef.current.getBoundingClientRect().left;
			const newHeight = e.clientY - resizableRef.current.getBoundingClientRect().top;
			setSize({
				width: Math.max(newWidth, 50),  // Ensure a minimum width
				height: Math.max(newHeight, 50)  // Ensure a minimum height
			});
		}
	};;

	// Stop resizing on mouseup
	const handleMouseUp = () => {
		isResizing.current = false;
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
	};

	return (
		<div
			ref={resizableRef}
			className="relative"
			style={{
				width: `${size.width}px`,
				height: `${size.height}px`,
				border: '2px solid #ccc'
			}}
		>
			{children}
			<div
				className="right-0 bottom-0 absolute cursor-move"
				style={{
					width: '20px',
					height: '20px',
				}}
				onMouseDown={handleMouseDown}
			>
				<Image className='w-5 h-5' src="https://api.iconify.design/lets-icons:resize-down-right.svg?color=%23d41111" alt="" />
			</div>
		</div>
	);
};

export default ResizableComponent;
