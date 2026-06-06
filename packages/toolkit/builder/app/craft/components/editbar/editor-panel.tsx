import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditor } from '@craftjs/core';
import { Layers } from '@craftjs/layers';
import { motion } from 'framer-motion';
import { X, Layers as LayersIcon } from 'lucide-react';
import React, { useState } from 'react';
import { SidebarItem } from '../resizable-container/sidebar-item';
import { Toolbar } from '../toolbar';
import { TeamsFontToggle } from '@ever-teams/atoms';

export const EditorPanel = () => {
	const [layersVisible, setLayerVisible] = useState(true);
	const [toolbarVisible, setToolbarVisible] = useState(true);

	const { enabled } = useEditor((state) => ({
		enabled: state.options.enabled
	}));

	const { actions, selected, isEnabled } = useEditor((state, query) => {
		const currentNodeId = query.getEvent('selected').last();
		let selected;

		if (currentNodeId) {
			selected = {
				id: currentNodeId,
				name: state.nodes[currentNodeId].data.name,
				settings: state.nodes[currentNodeId].related && state.nodes[currentNodeId].related.settings,
				isDeletable: query.node(currentNodeId).isDeletable()
			};
		}

		return {
			selected,
			isEnabled: enabled
		};
	});

	return (
		<motion.div
			className="relative"
			animate={
				isEnabled
					? {
							width: '500px',
							display: 'block'
						}
					: {
							width: 0,
							display: 'none'
						}
			}
		>
			<div className="absolute -left-[39.4px]">
				{selected && (
					<Button
						className="rounded-none dark:bg-gray-700 dark:text-white !rounded-ss-xl !rounded-es-xl border-l-0 dark:border-l-transparent"
						size={'icon'}
						variant={'outline'}
						onClick={() => actions.clearEvents()}
					>
						<X className="h-3 w-3" />
					</Button>
				)}
			</div>
			<ScrollArea
				id="edit-bar"
				className="h-[calc(100vh-_80px)] border-l dark:border-l-transparent bg-[#F8F8FF] dark:bg-[#030303]"
			>
				{selected && (
					<SidebarItem
						icon={<LayersIcon />}
						title="Customize"
						height={!toolbarVisible ? 'full' : '45%'}
						defaultVisible={layersVisible}
						onToggle={(val) => setLayerVisible(val)}
					>
						{selected && !selected.settings && <Toolbar />}
						<div className="p-4">
							{selected?.settings && (
								<div className="flex flex-col gap-y-2">
									<div data-cy="settings-panel">
										{selected?.settings &&
											React.createElement(selected.settings as React.ComponentType)}
									</div>
									<TeamsFontToggle />
									{selected?.id !== 'ROOT' && (
										<Button
											variant="destructive"
											color="default"
											className="mt-2 h-8"
											onClick={() => {
												actions.delete(selected.id);
											}}
										>
											Delete
										</Button>
									)}
								</div>
							)}
						</div>
					</SidebarItem>
				)}
				<SidebarItem
					icon={<LayersIcon />}
					title="Layers"
					height={selected ? (!toolbarVisible ? 'full' : '45%') : 'full'}
					defaultVisible={layersVisible}
					onToggle={(val) => setLayerVisible(val)}
				>
					<div className="">
						<Layers expandRootOnLoad={true} />
					</div>
				</SidebarItem>
			</ScrollArea>
		</motion.div>
	);
};
