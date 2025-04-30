import { getOrganizationIdCookie } from '@app/helpers';
import { useTaskStatus } from '@/core/hooks';
import { ITaskStatusItemList, ITaskStatusOrder } from '@/core/types/interfaces';
import { Button } from '@/core/components/ui/button';
import { Spinner } from '@/core/components/ui/loaders/spinner';
import { ScrollArea } from '@/core/components/ui/scroll-bar';
import { SixSquareGridIcon } from 'assets/svg';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const SortTasksStatusSettings = ({ arr, onClose }: { arr: ITaskStatusItemList[]; onClose: () => void }) => {
	const [items, setItems] = useState(arr);
	const [saveLoader, setSaveLoader] = useState(false);
	const [saveCheck, setSaveCheck] = useState(false);
	const organizationId = getOrganizationIdCookie();

	const t = useTranslations();
	const { reOrderTaskStatus, setTaskStatuses } = useTaskStatus();
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
			setSaveLoader(true);
			const reOrderedStatuses = await reOrderTaskStatus(data);
			setSaveLoader(false);

			if (reOrderedStatuses?.data?.length) {
				// Update task statuses state
				setTaskStatuses((prev) => {
					const statusesOrder = Object.fromEntries(
						reOrderedStatuses.data.map((el) => {
							return [el.id, el.order];
						})
					);

					return prev.map((status) => {
						return { ...status, order: statusesOrder[status.id] };
					});
				});
			}

			// setState(data.reorder);
			onClose();
			setSaveCheck(false);
		} else {
			onClose();
		}
	};
	return (
		<div className="w-[600px] h-[700px] py-12 pr-2  bg-[#f2f2f2] dark:bg-[#191a20] rounded-lg flex flex-col justify-center items-center">
			<h2 className="text-2xl font-bold text-center mb-4">{t('pages.settingsTeam.SORT_TASK_STATUSES')}</h2>
			<ScrollArea className="h-[450px] pr-3">
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
														<p className="capitalize">{item.name?.split('-').join(' ')}</p>
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
			<div className="absolute bottom-4 -right-20 flex w-80 space-x-2 mt-2">
				<Button onClick={onClose} variant={'outline'} className="p-4 w-28 !h-14 border-none ">
					{t('common.CANCEL')}
				</Button>
				<Button onClick={saveOrder} className="dark:text-white !h-14 space-x-2">
					{t('common.SAVE')} {saveLoader && <Spinner dark={false} />}
				</Button>
			</div>
		</div>
	);
};

export default SortTasksStatusSettings;
