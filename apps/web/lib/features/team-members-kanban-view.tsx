import { KanbanBoard, KanbanCard, KanbanColumn } from "lib/components/Kanban"
import { useEffect, useState } from "react";
import { DragDropContext, Draggable, DraggableProvided, DraggableStateSnapshot, DropResult, Droppable, DroppableProvided, DroppableStateSnapshot } from "react-beautiful-dnd";

const reorder = (list: any[], startIndex:number , endIndex:number ) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const grid = 0;

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
  width: '100%'
});


export const KanbanView = ({ itemsArray, columns }: { itemsArray: any[], columns: any[]}) => {

    const [items, setItems] = useState<any[]>(itemsArray);

    const onDragEnd = (result: DropResult) => {
          if (!result.destination) {
            return;
          }

          const allitem = reorder(
            items,
            result.source.index,
            result.destination.index
          );
    
          setItems(allitem);
        console.log('dragEnd')
    }

    const onDragStart = () => {
        console.log('dragStart')
    }

    // useEffect(() => {
    //     const animation = requestAnimationFrame(() => setEnabled(true));
    
    //     return () => {
    //       cancelAnimationFrame(animation);
    //       setEnabled(false);
    //     };
    // }, []);

    // if (!enabled) return null;

    return (
        <>
           <DragDropContext 
                onDragEnd={onDragEnd}
            >
              { items.length > 0 && 
              <KanbanColumn 
                droppableId="droppable"
                type="COLUMN"
                direction="horizontal"
              >
               {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                 <div
                      className="flex flex-row gap-[20px]"
                      ref={provided.innerRef}
                      style={getListStyle(snapshot.isDraggingOver)}
                      {...provided.droppableProps}
                  >
                  {items.length > 0 ?
                  <>
                  {items.map((item, index) => (
                      <Draggable draggableId={item.status.id} index={index} key={item.status.id}>
                        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={getItemStyle(
                                    snapshot.isDragging,
                                    provided.draggableProps.style
                                )}
                            >
                              <div
                                  isDragging={snapshot.isDragging}
                                  {...provided.dragHandleProps}
                              >
                                {item.status.name}
                              </div>
                              <KanbanColumn 
                                droppableId={item.id}
                                type="ITEM"
                                renderClone={
                                  (provided, snapshot, descriptor) => (
                                      <p>{item.content}</p>
                                  )
                                }
                                // direction="horizontal"
                              >
                              {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                                <div
                                      ref={provided.innerRef}
                                      style={getListStyle(snapshot.isDraggingOver)}
                                   
                                      isDraggingOver={snapshot.isDraggingOver}
                                      isDraggingFrom={Boolean(snapshot.draggingFromThisWith)}
                                      {...provided.droppableProps}
                                  >
                                    {items.map((item, index) => (
                                      <Draggable draggableId={item.status.id} index={index} key={item.status.id}>
                                        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                                          <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}

                                          >
                                            {item.content}
                                          </div>)}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                              )}
                              </KanbanColumn> 
                            </div>)}
                      </Draggable>
                  ))}
                  </>
                  :
                  null
                  }
                  {provided.placeholder}
                  </div>

              )}
              </KanbanColumn> 
              }
            </DragDropContext>
        </>
    )
}

{/* <KanbanCard 
  key={item.id} 
  index={index} 
  draggableId={item.id} 
  content={item.content} 
/> */}
