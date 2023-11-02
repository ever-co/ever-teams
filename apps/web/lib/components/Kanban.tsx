import { ReactNode } from 'react';
import { DragDropContext, Draggable, DraggableProvided, DraggableStateSnapshot, Droppable, DroppableProvided, DroppableStateSnapshot } from 'react-beautiful-dnd';

const grid = 8;

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

const reorder = (list: any[], startIndex:number , endIndex:number ) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
  
    return result;
};

export const KanbanBoard = ({children, items}: KanbanBoardProps) => {

    

    const onDragEnd = (result: any) => {
        if (!result.destination) {
        return;
      }
  
      const allitem = reorder(
        items,
        result.source.index,
        result.destination.index
      );
  
      setItems(
        allitem
      );
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
                {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={getListStyle(snapshot.isDraggingOver)}
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
