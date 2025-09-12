import { getOrganizationIdCookie } from '@/core/lib/helpers/index';
import { useTaskStatus } from '@/core/hooks';
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
	const { reOrderTaskStatus, setTaskStatuses, reOrderTaskStatusLoading } = useTaskStatus();
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
						})
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
		<div className="w-[500px] h-[700px] bg-[#f2f2f2] dark:bg-[#191a20] rounded-lg flex flex-col justify-between items-center">
			<div className="w-full grow flex flex-col item-center justify-center">
				<h2 className="text-2xl font-bold text-center mb-4">{t('pages.settingsTeam.SORT_TASK_STATUSES')}</h2>
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
															className="py-2 text-base rounded-md w-80"
															{...provided.draggableProps}
															ref={provided.innerRef}
														>
															<div className="border flex justify-start items-center p-4 text-base rounded-md w-80">
																<div {...provided.dragHandleProps}>
																	<SixSquareGridIcon className="w-6 h-6" />
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
				<Button
					onClick={onClose}
					disabled={reOrderTaskStatusLoading}
					variant={'outline'}
					className="p-4 w-28 !h-14 border-none"
				>
					{t('common.CANCEL')}
				</Button>
				<Button
					onClick={saveOrder}
					disabled={reOrderTaskStatusLoading}
					className="dark:text-white flex items-center justify-center w-28 !h-14 gap-2"
				>
					{t('common.SAVE')} {reOrderTaskStatusLoading && <Spinner />}
				</Button>
			</div>
		</div>
	);
};

export default SortTasksStatusSettings;
