import { IDailyPlan, ITeamTask } from "@app/interfaces";
import { DropResult } from "react-beautiful-dnd";

export const handleDragAndDrop = (results: DropResult, plans: IDailyPlan[], setPlans: React.Dispatch<React.SetStateAction<IDailyPlan[]>>) => {
    const { source, destination } = results;

    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;

    const newPlans = [...plans];

    const planSourceIndex = newPlans.findIndex(plan => plan.id === source.droppableId);
    const planDestinationIndex = newPlans.findIndex(plan => plan.id === destination.droppableId);

    const newSourceTasks = [...(newPlans[planSourceIndex].tasks ?? [])];
    const newDestinationTasks = source.droppableId !== destination.droppableId
        ? [...(newPlans[planDestinationIndex].tasks ?? [])]
        : newSourceTasks;

    const [deletedTask] = newSourceTasks.splice(source.index, 1);
    newDestinationTasks.splice(destination.index, 0, deletedTask);

    newPlans[planSourceIndex] = {
        ...newPlans[planSourceIndex],
        tasks: newSourceTasks,
    };
    newPlans[planDestinationIndex] = {
        ...newPlans[planDestinationIndex],
        tasks: newDestinationTasks,
    };
    setPlans(newPlans);
};


export const handleDragAndDropDailyOutstandingAll = (
    results: DropResult,
    tasks: ITeamTask[],
    setTasks: React.Dispatch<React.SetStateAction<ITeamTask[]>>
) => {
    const { source, destination } = results;

    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;

    const newTasks = [...tasks];
    const [movedTask] = newTasks.splice(source.index, 1);
    newTasks.splice(destination.index, 0, movedTask);

    setTasks(newTasks);
};
