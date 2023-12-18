import { useKanban } from "@app/hooks/features/useKanban";
import { ITaskStatus, ITaskStatusItemList, ITeamTask } from "@app/interfaces";
import { IKanban } from "@app/interfaces/IKanban";
import { clsxm } from "@app/utils";
import KanbanDraggable, { EmptyKanbanDroppable } from "lib/components/Kanban"
import React from "react";
import {  useEffect, useState } from "react";
import { DragDropContext, DraggableLocation, DropResult, Droppable, DroppableProvided, DroppableStateSnapshot } from "react-beautiful-dnd";


export const KanbanView = ({ kanbanBoardTasks }: { kanbanBoardTasks: IKanban}) => {

    const { columns:kanbanColumns, updateKanbanBoard,  updateTaskStatus, isColumnCollapse } = useKanban();
   
    const [items, setItems] = useState<IKanban>(kanbanBoardTasks);
  
    const [columns, setColumn] = useState<string[]>(Object.keys(kanbanBoardTasks));

    const reorderTask = (list: ITeamTask[] , startIndex:number , endIndex:number ) => {
      const tasks = Array.from(list);
      const [removedTask] = tasks.splice(startIndex, 1);
      tasks.splice(endIndex, 0, removedTask);
     
      return tasks;
    };

    const reorderColumn = (list: IKanban , startIndex:number , endIndex:number ) => {
      const columns = Object.keys(list)
      const [removedColumn] = columns.splice(startIndex, 1);
      columns.splice(endIndex, 0, removedColumn);
      return columns;
    };
    
    const reorderKanbanTasks = ({ kanbanTasks, source, destination }: {
      kanbanTasks: IKanban,
      source: DraggableLocation,
      destination: DraggableLocation
    }) => {
      const sourceDroppableID = source.droppableId;
      const destinationDroppableID = destination.droppableId;
      const sourceIndex = source.index;
      const destinationIndex = destination.index;
      const currentTaskStatus = [...kanbanTasks[sourceDroppableID]];
      const nextTaskStatus = [...kanbanTasks[destinationDroppableID]];
      const targetStatus = currentTaskStatus[source.index];
    
      // moving to same list
      if (sourceDroppableID === destinationDroppableID) {
        const reorderedKanbanTasks = reorderTask(currentTaskStatus, sourceIndex, destinationIndex);
        const result = {
          ...kanbanTasks,
          [sourceDroppableID]: reorderedKanbanTasks,
        };
        return {
          kanbanBoard: result,
        };
      }
    
      // remove from original
      currentTaskStatus.splice(sourceIndex, 1);

      const taskstatus = destinationDroppableID as ITaskStatus;
     
      const updateTaskStatusData = {...targetStatus, status: taskstatus};
      
      // update task status on server
      updateTaskStatus(updateTaskStatusData);
    
      // insert into next
      nextTaskStatus.splice(destinationIndex, 0, updateTaskStatusData);
    
      const result = {
        ...kanbanTasks,
        [sourceDroppableID]: currentTaskStatus,
        [destinationDroppableID]: nextTaskStatus,
      };
    
      return {
        kanbanBoard: result,
      };
    };
    
    const getHeaderBackground = (columns: ITaskStatusItemList[], column: string) => {
    
      const selectState = columns.filter((item: ITaskStatusItemList)=> {
        return item.name === column
      });
    
      return selectState[0].color
    }
   
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
  

      if (result.type === 'COLUMN') {
        const reorderedItem = reorderColumn(items, source.index, destination.index);
        setColumn(reorderedItem);
       
        return;
      }
  
      const data = reorderKanbanTasks({
        kanbanTasks: items,
        source,
        destination,
      });
  
      setItems(data.kanbanBoard);
      updateKanbanBoard(() => data.kanbanBoard)
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
                  className={clsxm("flex flex-row justify-start overflow-x-auto gap-[20px] w-full min-h-[600px] p-[32px] bg-transparent dark:bg-[#181920]", snapshot.isDraggingOver ? "lightblue" : "#F7F7F8")}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {columns.length > 0 ?
                  <>
                    {columns.map((column: string, index: number) => {
                      return (
                        <React.Fragment key={index}>
                        { isColumnCollapse(column) ?
                        <div className={'order-last'} key={index}>
                          <EmptyKanbanDroppable 
                              index={index} 
                              title={column}
                              items={items[column]}
                          />
                        </div>
                        :
                        <>
                          <div className="flex flex-col">
                            <KanbanDraggable 
                              key={index}
                              index={index}
                              title={column}
                              items={items[column]} 
                              backgroundColor={getHeaderBackground(kanbanColumns, column)}                            
                            />
                           
                          </div>
                        </>
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


