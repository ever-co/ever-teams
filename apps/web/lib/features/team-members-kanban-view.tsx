import KanbanDraggable from "lib/components/Kanban"
import {  useState } from "react";
import { DragDropContext, DropResult, Droppable, DroppableProvided, DroppableStateSnapshot } from "react-beautiful-dnd";

const reorder = (list: any[], startIndex:number , endIndex:number ) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const grid = 0;

const getListStyle = (isDraggingOver: any) => ({
  background: isDraggingOver ? "lightblue" : "lightgrey",
  padding: grid,
  width: '100%'
});

export const reorderQuoteMap = ({ quoteMap, source, destination }) => {
  const current = [...quoteMap[source.droppableId]];
  const next = [...quoteMap[destination.droppableId]];
  const target = current[source.index];

  // moving to same list
  if (source.droppableId === destination.droppableId) {
    const reordered = reorder(current, source.index, destination.index);
    const result = {
      ...quoteMap,
      [source.droppableId]: reordered,
    };
    return {
      quoteMap: result,
    };
  }

  // moving to different list

  // remove from original
  current.splice(source.index, 1);
  // insert into next
  next.splice(destination.index, 0, target);

  const result = {
    ...quoteMap,
    [source.droppableId]: current,
    [destination.droppableId]: next,
  };

  return {
    quoteMap: result,
  };
};


export const KanbanView = ({ itemsArray }: { itemsArray: any}) => {

    const [items, setItems] = useState<any>(itemsArray);

    const [columnn, setColumns ] = useState<any>(Object.keys(itemsArray))

    /**
     * This function handles all drag and drop logic
     * on the kanban board.
     * @param result 
     * @returns 
     */
    const onDragEnd = (result: DropResult) => {

      if (result.combine) {
        if (result.type === 'COLUMN') {
          const shallow = [...columnn];
          shallow.splice(result.source.index, 1);
          setColumns(shallow);
          return;
        }
  
        const item = items.filter((item)=> item.status.name === result.source.droppableId);
        const withQuoteRemoved = [...item];
  
        withQuoteRemoved.splice(result.source.index, 1);
  
        const orderedColumns = [
          ...items,
          // [result.source.droppableId]: withQuoteRemoved,
        ];
        setItems(orderedColumns);
        return;
      }

      // dropped nowhere
      if (!result.destination) {
        return;
      }

      const source = result.source;
      const destination = result.destination;
  
      // did not move anywhere - can bail early
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }
  
      // reordering column
      if (result.type === 'COLUMN') {
        const reorderedorder = reorder(items, source.index, destination.index);
  
        setItems(reorderedorder);
  
        return;
      }
  
      const data = reorderQuoteMap({
        quoteMap: items,
        source,
        destination,
      });
  
      setItems(data.quoteMap);
       
    }

    return (
        <>
           <DragDropContext 
                onDragEnd={onDragEnd}
            >
              { columnn.length > 0 && 
              <Droppable 
                droppableId="droppable"
                type="COLUMN"
                direction="horizontal"
              >
              {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                <div
                  className="flex flex-row gap-[20px] min-h-screen"
                  ref={provided.innerRef}
                  style={getListStyle(snapshot.isDraggingOver)}
                  {...provided.droppableProps}
                >
                  {columnn.length > 0 ?
                  <>
                  {columnn.map((column, index) => (
                    <KanbanDraggable 
                      key={column} 
                      index={index} 
                      title={column}
                      draggableId={column} 
                      content={items[column]}
                    />
                  ))}
                  </>
                  :
                  null
                  }
                  {provided.placeholder}
                </div>
              )}
              </Droppable> 
              }
            </DragDropContext>
        </>
    )
}


