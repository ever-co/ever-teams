import { ReactElement } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';

type KanbanBoardProps = {
    children: ReactElement
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
