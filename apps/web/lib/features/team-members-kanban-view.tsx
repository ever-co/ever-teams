import { KanbanBoard, KanbanCard, KanbanColumn } from "lib/components/Kanban"
import { useState } from "react";
import { DragDropContext, Draggable, DraggableProvided, DraggableStateSnapshot, DropResult, Droppable, DroppableProvided, DroppableStateSnapshot } from 'react-beautiful-dnd';

// fake data generator
const getItems = (count: number) =>
  Array.from({ length: count }, (v, k) => k).map(k => ({
    id: `item-${k}`,
    content: `item ${k}`
}));

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

// type KanbanBoardProps = {
//     children: ReactNode;
//     items: any[]
// }

const reorder = (list: any[], startIndex:number , endIndex:number ) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
  
    return result;
};

const getRenderItem = (items: any[]) => (provided: any, snapshot: any, rubric: any) => (
    <div
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      ref={provided.innerRef}
    >
      Item id: {items[rubric.source.index].id}
    </div>
  );


export const KanbanView = () => {

    const [items, setItems] = useState<any[]>(getItems(10));

    const renderItem = getRenderItem(items);

    const onDragEnd = (result: DropResult) => {
    //   if (!result.destination) {
    //     return;
    //   }

    //   const allitem = reorder(
    //     items,
    //     result.source.index,
    //     result.destination.index
    //   );
  
    //   setItems(allitem);
    console.log('dragEnd')
    }

    const onDragStart = () => {
        console.log('dragStart')
    }

    return (
        <>
            <DragDropContext 
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
            >
               
                         <Droppable droppableId="droppable"  renderClone={renderItem}>
                        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                            <div
                                ref={provided.innerRef}
                                style={getListStyle(snapshot.isDraggingOver)}
                                {...provided.droppableProps}
                            >
                            {items.map((item, index) => (
                                <Draggable 
                                    key={item.id} 
                                    draggableId={item.id} 
                                    index={index}  
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
                                        {item.content}
                                    </div>
                                )}
                                </Draggable>
                            ))}
                            {/* {provided.placeholder} */}
                            </div>
                        )}
                        </Droppable> 
                    
            </DragDropContext>
        </>
    )
}

//  <Droppable droppableId="droppable">
// {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
//     <div
//         ref={provided.innerRef}
//         style={getListStyle(snapshot.isDraggingOver)}
//         {...provided.droppableProps}
//     >
//     {items.map((item, index) => (
//         <Draggable 
//             key={item.id} 
//             draggableId={item.id} 
//             index={index}  
//         >
//         {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
//             <div
//                 ref={provided.innerRef}
//                 {...provided.draggableProps}
//                 {...provided.dragHandleProps}
//                 style={getItemStyle(
//                     snapshot.isDragging,
//                     provided.draggableProps.style
//                 )}
//             >
//                 {item.content}
//             </div>
//         )}
//         </Draggable>
//     ))}
//     {/* {provided.placeholder} */}
//      </div>
//  )}
// </Droppable> 