import { useKanban } from "@app/hooks/features/useKanban";
import { ITaskStatusItemList, ITeamTask } from "@app/interfaces";
import { IKanban } from "@app/interfaces/IKanban";
import { clsxm } from "@app/utils";
import KanbanDraggable, { EmptyKanbanDroppable } from "lib/components/Kanban"
import { AddIcon } from "lib/components/svgs";
import React from "react";
import {  useEffect, useState } from "react";
import { DragDropContext, DraggableLocation, DropResult, Droppable, DroppableProvided, DroppableStateSnapshot } from "react-beautiful-dnd";

const reorder = (list: ITeamTask[], startIndex:number , endIndex:number ) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
 
  return result;
};

const reorderItemMap = ({ itemMap, source, destination }: {
  itemMap: IKanban,
  source: DraggableLocation,
  destination: DraggableLocation
}) => {
  const current = [...itemMap[source.droppableId]];
  const next = [...itemMap[destination.droppableId]];
  const target = current[source.index];

  // moving to same list
  if (source.droppableId === destination.droppableId) {
    const reordered = reorder(current, source.index, destination.index);
    const result = {
      ...itemMap,
      [source.droppableId]: reordered,
    };
    return {
      quoteItem: result,
    };
  }

  // remove from original
  current.splice(source.index, 1);
  // insert into next
  next.splice(destination.index, 0, target);

  const result = {
    ...itemMap,
    [source.droppableId]: current,
    [destination.droppableId]: next,
  };

  return {
    quoteItem: result,
  };
};

const getHeaderBackground = (columns: ITaskStatusItemList[], column: string) => {

  const selectState = columns.filter((item: ITaskStatusItemList)=> {
    return item.name === column
  });

  return selectState[0].color
}

export const KanbanView = ({ itemsArray }: { itemsArray: IKanban}) => {

    const { columns:kanbanColumns, updateKanbanBoard, data:kanbandata } = useKanban();

    const [items, setItems] = useState<IKanban>(itemsArray);
   
    const [columns, setColumn] = useState<string[]>(Object.keys(itemsArray));
   
    /**
     * This function handles all drag and drop logic
     * on the kanban board.
     * @param result 
     * @returns 
     */
    const onDragEnd = (result: DropResult) => {

      if (result.combine) {
        if (result.type === 'COLUMN') {
          const shallow = [...columns];
          shallow.splice(result.source.index, 1);
          setColumn(shallow);
          return;
        }
  
        const item = items[result.source.droppableId];
        const withItemRemoved = [...item];
  
        withItemRemoved.splice(result.source.index, 1);
  
        const orderedItems = {
          ...items,
          [result.source.droppableId]: withItemRemoved,
        };
        setItems(orderedItems);

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
  
      // TODO: fix issues with reordering column
      // if (result.type === 'COLUMN') {
      //   const reorderedItem = reorder(items, source.index, destination.index);
  
      //   setItems(reorderedItem);
      //   // updateKanbanBoard(reorderedItem);
      //   // console.log('data '+ kanbandata)
      //   return;
      // }
  
      const data = reorderItemMap({
        itemMap: items,
        source,
        destination,
      });
  
      setItems(data.quoteItem);
  
    }

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
           <DragDropContext 
                onDragEnd={onDragEnd}
            >
              { columns.length > 0 && 
              <Droppable 
                droppableId="droppable"
                type="COLUMN"
                direction="horizontal"
              >
              {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                <div
                  className={clsxm("flex flex-row justify-center gap-[20px] w-full min-h-[600px] p-[32px] bg-transparent dark:bg-[#181920]", snapshot.isDraggingOver ? "lightblue" : "#F7F7F8")}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {columns.length > 0 ?
                  <>
                    {columns.map((column: any, index: number) => {
                      return (
                        <React.Fragment key={index}>
                        { items[column].length > 0 ?
                        <>
                          <div className="flex flex-col" key={index}>
                            <KanbanDraggable 
                              index={index}
                              title={column}
                              items={items[column]} 
                              backgroundColor={getHeaderBackground(kanbanColumns, column)}                            
                            />
                            <div className="flex flex-row items-center text-base not-italic font-semibold rounded-2xl gap-4 bg-white dark:bg-dark--theme-light p-4">
                                <AddIcon height={20} width={20}/>
                                <p>Create Issues</p>
                            </div>
                          </div>
                        </>
                        :
                        <div className={'order-last'} key={index}>
                          <EmptyKanbanDroppable 
                              index={index} 
                              title={column}
                              items={items[column]}
                          />
                        </div>
                      }
                      </React.Fragment>
                      )
                    })}
                  </>
                  :
                    null
                  }
                  <>
                  {provided.placeholder}
                  </>
                </div>
              )}
              </Droppable> 
              }
            </DragDropContext>
        </>
    )
}


