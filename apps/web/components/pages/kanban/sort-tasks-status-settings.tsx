import { getOrganizationIdCookie } from '@app/helpers';
import { useTaskStatus } from '@app/hooks';
import { ITaskStatusItemList } from '@app/interfaces';
import { Button } from '@components/ui/button';
import { SixSquareGridIcon } from 'assets/svg';
import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const SortTasksStatusSettings = ({ arr }: { arr: ITaskStatusItemList[] }) => {
	const [items, setItems] = useState(arr);
	const organizationId = getOrganizationIdCookie();
	console.log('organizationId', organizationId);
	const { reOrderQueryCall } = useTaskStatus();
	const onDragEnd = (result) => {
		if (!result.destination) return; // dropped outside the list

		const newItems = Array.from(items);
		const [reorderedItem] = newItems.splice(result.source.index, 1);
		newItems.splice(result.destination.index, 0, reorderedItem);

		setItems(newItems);
		console.log(
			'ddd-ddd-ddd-ddd-ddd',
			newItems.map((item) => {
				return {
					id: item.id,
					order: item.order
				};
			})
		);
	};
	const saveOrder = async () => {
		const data: any = {
			organizationId,
			reorder: items.map((item, index) => {
				return {
					id: item.id,
					order: index
				};
			})
		};
		console.log(
			'data',
			items.map((item, index) => {
				return {
					id: item.id,
					order: index,
					name: item.name
				};
			})
		);
		await reOrderQueryCall(data);
	};
	return (
		<div className="w-[600px] h-[700px] py-12 pr-2  bg-[#f2f2f2] dark:bg-[#191a20] rounded-lg flex flex-col justify-center items-center">
			<h2 className="text-2xl font-bold text-center mb-4">Sort Task Status</h2>
			<div className="h-[450px] overflow-y-auto">
				<DragDropContext onDragEnd={onDragEnd}>
					<Droppable droppableId="droppable">
						{(provided) => (
							<div {...provided.droppableProps} ref={provided.innerRef}>
								<>
									{items.map((item, index) => (
										<Draggable key={item.id} draggableId={item.id} index={index}>
											{(provided) => (
												<div
													className="py-2 text-base rounded-md w-80"
													{...provided.draggableProps}
													ref={provided.innerRef}
												>
													<div className="border flex justify-start items-center p-4 text-base rounded-md w-80">
														<div {...provided.dragHandleProps}>
															<SixSquareGridIcon className="w-6 h-6" />
														</div>
														<p>{item.name}</p>
													</div>
												</div>
											)}
										</Draggable>
									))}
									{provided?.placeholder}
								</>
							</div>
						)}
					</Droppable>
				</DragDropContext>
			</div>
			<div className="flex w-80 space-x-2 mt-2">
				<Button variant={'outline'} className="p-4 w-28 !h-14 border-none ">
					Cancel
				</Button>
				<Button onClick={saveOrder} className="dark:text-white !h-14">
					Save & Update
				</Button>
			</div>
		</div>
	);
};

export default SortTasksStatusSettings;
