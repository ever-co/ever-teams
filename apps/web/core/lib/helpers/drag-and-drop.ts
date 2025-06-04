import { IDailyPlan } from '@/core/types/interfaces/task/daily-plan/daily-plan';
import { ITask } from '@/core/types/interfaces/task/task';
import { DropResult } from '@hello-pangea/dnd';

export const handleDragAndDrop = (
	results: DropResult,
	plans: IDailyPlan[],
	setPlans: React.Dispatch<React.SetStateAction<IDailyPlan[]>>
) => {
	const { source, destination } = results;

	if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;

	const newPlans = [...plans];

	const planSourceIndex = newPlans.findIndex((plan) => plan.id === source.droppableId);
	const planDestinationIndex = newPlans.findIndex((plan) => plan.id === destination.droppableId);

	const newSourceTasks = [...(newPlans[planSourceIndex].tasks ?? [])];
	const newDestinationTasks =
		source.droppableId !== destination.droppableId
			? [...(newPlans[planDestinationIndex].tasks ?? [])]
			: newSourceTasks;

	const [deletedTask] = newSourceTasks.splice(source.index, 1);
	newDestinationTasks.splice(destination.index, 0, deletedTask);

	newPlans[planSourceIndex] = {
		...newPlans[planSourceIndex],
		tasks: newSourceTasks
	};
	newPlans[planDestinationIndex] = {
		...newPlans[planDestinationIndex],
		tasks: newDestinationTasks
	};
	setPlans(newPlans);
};

export const handleDragAndDropDailyOutstandingAll = (
	results: DropResult,
	tasks: ITask[],
	setTasks: React.Dispatch<React.SetStateAction<ITask[]>>
) => {
	try {
		const { source, destination } = results;

		// Validate inputs
		if (!Array.isArray(tasks)) {
			console.error('Invalid tasks array provided to handleDragAndDropDailyOutstandingAll');
			return;
		}

		// Early return if no change is needed
		if (
			!destination ||
			(source.droppableId === destination.droppableId && source.index === destination.index) ||
			source.index < 0 ||
			destination.index < 0 ||
			source.index >= tasks.length ||
			destination.index > tasks.length
		) {
			return;
		}

		// Create a new array with unique tasks only
		const uniqueTasks = Array.from(new Map(tasks.map((task) => [task.id, task])).values());

		// Perform the move operation
		const newTasks = [...uniqueTasks];
		const [movedTask] = newTasks.splice(source.index, 1);

		// Ensure the task was found and removed
		if (!movedTask) {
			console.error('Failed to find task at source index:', source.index);
			return;
		}

		// Insert at new position
		newTasks.splice(destination.index, 0, movedTask);

		// Update state with new order
		setTasks(newTasks);

		// Optional: Return the new array for external handlers
		return newTasks;
	} catch (error) {
		console.error('Error in handleDragAndDropDailyOutstandingAll:', error);
		// Maintain current state in case of error
		setTasks(tasks);
	}
};
