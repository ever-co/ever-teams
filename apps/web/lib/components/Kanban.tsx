import { ReactNode, useEffect, useState } from 'react';
import { DragDropContext, DragDropContextProps, Draggable, DraggableProvided, DraggableStateSnapshot, Droppable, DroppableProps, DroppableProvided, DroppableStateSnapshot } from 'react-beautiful-dnd';

const grid = 8;

const reorder = (list: any[], startIndex:number , endIndex:number ) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
  
    return result;
};

const getItemStyle = (isDragging: any, draggableStyle: any) => ({
  // some basic styles to make the items look a bit nicer
  userSelect: "none",
  padding: grid * 2,
  margin: `0 0 ${grid}px 0`,

  // change background colour if dragging
  background: isDragging ? "lightgreen" : "grey",

  // styles we need to apply on draggables
  ...draggableStyle
});

const getListStyle = (isDraggingOver: any) => ({
  background: isDraggingOver ? "lightblue" : "lightgrey",
  padding: grid,
  width: 250
});

type KanbanBoardProps = {
    children: ReactNode;
    items: any[]
}



export const KanbanBoard = ({children}: DragDropContextProps) => {

    const onDragEnd = (result: any) => {
     
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

export const KanbanColumn = ({ children, ...props }: DroppableProps) => {
    const [enabled, setEnabled] = useState(false);
  
    useEffect(() => {
      const animation = requestAnimationFrame(() => setEnabled(true));
  
      return () => {
        cancelAnimationFrame(animation);
        setEnabled(false);
      };
    }, []);
  
    if (!enabled) return null;
  
    return (
    <>
        <Droppable {...props}>
            {children}
        </Droppable>
    </>
    )
  };

type KanbanCardProps = {
    key: string;
    index: number;
    draggableId: string;
    content: string;
}

export const KanbanCard = ({key, index, draggableId, content}: KanbanCardProps) => {
    return (
        <>
            <Draggable
                key={key}
                index={index}
                draggableId={draggableId}
            >
                {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                     <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={getItemStyle(
                            snapshot.isDragging,
                            provided.draggableProps.style
                        )}
                    >
                        {content}
                    </div>
                )}
            </Draggable>
        </>
    )
}
