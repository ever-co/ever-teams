import { getOrganizationIdCookie } from '@/core/lib/helpers/index';
import { useReorderTaskStatus } from '@/core/hooks/tasks/use-reorder-task-status';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner } from '@/core/components/common/spinner';
import { ScrollArea } from '@/core/components/common/scroll-bar';
import { SixSquareGridIcon } from 'assets/svg';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ITaskStatusOrder } from '@/core/types/interfaces/task/task-status/task-status-order';
import { TTaskStatus } from '@/core/types/schemas';

const SortTasksStatusSettings = ({ arr, onClose }: { arr: TTaskStatus[]; onClose: () => void }) => {
	const [items, setItems] = useState(arr);
	const [saveCheck, setSaveCheck] = useState(false);
	const organizationId = getOrganizationIdCookie();

	const t = useTranslations();
	const { reOrderTaskStatus, reOrderTaskStatusLoading } = useReorderTaskStatus();
	const { setTaskStatuses } = useTaskStatusesQuery();
	const onDragEnd = (result: DropResult) => {
		if (!result.destination) return; // dropped outside the list
		const newItems = Array.from(items);
		const [reorderedItem] = newItems.splice(result.source.index, 1);
		newItems.splice(result.destination.index, 0, reorderedItem);
		setItems(newItems);
		setSaveCheck(true);
	};
	const saveOrder = async () => {
		if (saveCheck) {
			const data: ITaskStatusOrder = {
				organizationId,
				reorder: items.map((item, index) => {
					return {
						id: item.id,
						order: index
					};
				})
			};
			const reOrderedStatuses = await reOrderTaskStatus(data);

			if (reOrderedStatuses?.list.length) {
				// Update task statuses state
				setTaskStatuses((prev) => {
					const statusesOrder = Object.fromEntries(
						reOrderedStatuses?.list.map((el: any) => {
							return [el.id, el.order];
						}) ?? []
					);

					return prev.map((status) => {
						return { ...status, order: statusesOrder[status.id] };
					});
				});
			}

			onClose();
			setSaveCheck(false);
		} else {
			onClose();
		}
	};
	return (
		<div className="w-[500px] h-[700px] flex flex-col justify-between items-center">
			<div className="w-full grow flex flex-col items-center justify-center">
				<h2 className="text-lg font-semibold text-center text-balance mb-4">
					{t('pages.settingsTeam.SORT_TASK_STATUSES')}
				</h2>
				<div className="h-[450px] w-full flex items-center justify-center">
					<ScrollArea className="h-full">
						<DragDropContext onDragEnd={onDragEnd}>
							<Droppable droppableId="droppable">
								{(provided) => (
									<div {...provided.droppableProps} ref={provided.innerRef}>
										<>
											{items.map((item, index) => (
												<Draggable key={item.id} draggableId={item.id} index={index}>
													{(provided) => (
														<div
															className="w-80 py-0.5 text-sm"
															{...provided.draggableProps}
															ref={provided.innerRef}
														>
															<div className="flex w-80 items-center justify-start gap-2 rounded-md bg-foreground/[0.025] px-3 py-2 text-sm">
																<div {...provided.dragHandleProps}>
																	<SixSquareGridIcon className="size-5 text-muted-foreground" />
																</div>
																<p className="capitalize">
																	{item.name?.split('-').join(' ')}
																</p>
															</div>
														</div>
													)}
												</Draggable>
											))}
											{provided.placeholder}
										</>
									</div>
								)}
							</Droppable>
						</DragDropContext>
					</ScrollArea>
				</div>
			</div>

			<div className=" shrink-0 w-full p-2 flex justify-end gap-2">
				<Button onClick={onClose} disabled={reOrderTaskStatusLoading} variant={'outline'} className="w-28">
					{t('common.CANCEL')}
				</Button>
				<Button
					onClick={saveOrder}
					disabled={reOrderTaskStatusLoading}
					className="flex items-center justify-center w-28 gap-2"
				>
					{t('common.SAVE')} {reOrderTaskStatusLoading && <Spinner />}
				</Button>
			</div>
		</div>
	);
};

export default SortTasksStatusSettings;
