import { cn } from '@ever-teams/toolkit-ui';
import { useEditor } from '@craftjs/core';
import React, { useEffect } from 'react';

export const Viewport: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
	const {
		enabled,
		connectors,
		actions: { setOptions }
	} = useEditor((state) => ({
		enabled: state.options.enabled
	}));

	useEffect(() => {
		if (!window) {
			return;
		}

		window.requestAnimationFrame(() => {
			// Notify doc site
			window.parent.postMessage(
				{
					LANDING_PAGE_LOADED: true
				},
				'*'
			);

			setTimeout(() => {
				setOptions((options) => {
					options.enabled = true;
				});
			}, 200);
		});
	}, [setOptions]);

	return (
		<div className="viewport">
			<div
				className={cn([
					'.craftjs-renderer page-container  flex-1 min-h-96 w-full transition pb-8 overflow-auto',
					{ 'bg-[#F8F8FF] dark:bg-[#1E2025]': enabled }
				])}
				ref={(ref) => {
					if (ref instanceof HTMLElement) {
						connectors.select(connectors.hover(ref, ''), '');
					}
				}}
			>
				<div className="relative flex-col flex items-center pt-8">{children}</div>
			</div>
		</div>
	);
};
