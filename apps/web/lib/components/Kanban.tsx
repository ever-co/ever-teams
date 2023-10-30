import { ReactNode } from 'react';
import { DragDropContext, Draggable, DraggableProvided, DraggableStateSnapshot, Droppable, DroppableProvided, DroppableStateSnapshot } from 'react-beautiful-dnd';

type KanbanBoardProps = {
    children: ReactNode
}

export const KanbanBoard = ({children}: KanbanBoardProps) => {

    const onDragEnd = () => {

    }

    return (
        <>
            <DragDropContext 
                onDragEnd={onDragEnd}
            >
                { children}
            </DragDropContext>
        </>
    )
}

type KanbanColumnProps = {
    droppableId: string,
    children: ReactNode
}

export const KanbanColumn = ({ droppableId, children }: KanbanColumnProps) => {
    return (
        <>
            <Droppable 
                droppableId={droppableId}
            >
                {(provided: DroppableProvided, snapshop: DroppableStateSnapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{}}
                    >
                        { children }
                    </div>
                )}
            </Droppable>
        </>
    )
}

type KanbanCardProps = {
    key: string;
    index: number;
    draggableId: string;
}

export const KanbanCard = ({key, index, draggableId}: KanbanCardProps) => {
    return (
        <>
            <Draggable
                key={key}
                index={index}
                draggableId={draggableId}
            >
                {(provided: DraggableProvided, snapshop: DraggableStateSnapshot) => (
                     <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{}}
                    >
                        
                    </div>
                )}
            </Draggable>
        </>
    )
}
