import { useEditor } from '@craftjs/core';
import React from 'react';

export const Toolbar: React.FC = () => {
	const { active, related } = useEditor((state, query) => {
		// Get the first selected node
		const selectedNodeId = query.getEvent('selected').first();
		return {
			active: selectedNodeId,
			related: selectedNodeId ? state.nodes[selectedNodeId].related : null
		};
	});

	return (
		<div className="py-1 h-full">
			<div className="flex justify-between items-center">
				<div className="flex-1">
					{active && related?.toolbar && <related.toolbar />}
					{!active && (
						<div className="px-5 py-2 flex flex-col items-center h-full justify-center text-center text-sm text-opacity-60 text-black dark:text-slate-400">
							<h2 className="pb-1">Click on a component to start editing.</h2>
							<h2>
								You could also double click on the layers below to edit their names, like in Photoshop
							</h2>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
