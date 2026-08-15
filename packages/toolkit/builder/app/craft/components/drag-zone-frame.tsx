import { Element, Frame } from '@craftjs/core';
import React from 'react';
import { Viewport } from '.';
import { ResizableContainer } from './resizable-container';

const DragZoneFrame = () => {
	return (
		<Viewport>
			<Frame>
				<Element
					canvas
					is={ResizableContainer}
					width="800px"
					height="auto"
					background={{ r: 255, g: 255, b: 255, a: 1 }}
					padding={['40px', '40px', '40px', '40px']}
					custom={{ displayName: 'Teams Canvas' }}
					data-cy="root-container"
					id="no-drag">
				</Element>
			</Frame>
		</Viewport>
	);
};

export default DragZoneFrame;
