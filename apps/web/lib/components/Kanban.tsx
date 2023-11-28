import LeftArrowTailessIcon from '@components/ui/svgs/left-arrow-tailess';
import ThreeDotIcon from '@components/ui/svgs/three-dot';
import React from 'react';
import { useEffect, useState } from 'react';
import { Draggable, DraggableProvided, DraggableStateSnapshot, Droppable, DroppableProvided, DroppableStateSnapshot } from 'react-beautiful-dnd';
import Item from './kanban-card';

const grid = 8;

const getItemStyle = (isDragging: any, draggableStyle: any) => ({
  userSelect: "none",
  margin: `0 0 ${grid}px 0`,
  background: isDragging ? "lightgreen" : null,
  ...draggableStyle
});

const getBackgroundColor = (dropSnapshot: DroppableStateSnapshot) => {
    
    if (dropSnapshot.isDraggingOver) {
      return {
        backgroundColor: '#FFEBE6',
    }
    }
    if (dropSnapshot.draggingFromThisWith) {
      return {
        backgroundColor:  '#E6FCFF',
    }
    }
    return {
        backgroundColor:  '',
      
    }
};

// this function changes column header color when dragged
function headerStyleChanger(snapshot: DraggableStateSnapshot, bgColor: any){
    const backgroundColor = snapshot.isDragging ? '#0000ee' : bgColor;

    return {
        backgroundColor
    }
}

/**
 * wrapper to ensure card is draggable
 * @param param0 
 * @returns 
 */
function InnerItemList({items}: {
    items: any[]
}) {
    return (
        <>
        <section className="flex flex-col gap-2.5 max-h-[520px] overflow-scroll ">
        {items.map((item: any, index: number) => (
            <Draggable key={item.id} draggableId={item.id} index={index}>
                {(dragProvided: DraggableProvided, dragSnapshot: DraggableStateSnapshot) => (
                <Item
                    key={item.id}
                    item={item}
                    isDragging={dragSnapshot.isDragging}
                    isGroupedOver={Boolean(dragSnapshot.combineTargetFor)}
                    provided={dragProvided}
                />
                )}
            </Draggable>
        ))
        }
         </section>
    </>
)}

/**
 * inner column within a kanban column,
 * it holds all cards underneath the name of the column
 * @param props 
 * @returns 
 */
function InnerList(props: {
    title: string, 
    items: any,
    dropProvided: DroppableProvided,
    dropSnapshot: DroppableStateSnapshot
}) {
    const { items, dropProvided, dropSnapshot } = props;
  
    return (
   
        <div 
        style={getBackgroundColor(dropSnapshot)}
        ref={dropProvided.innerRef}>
          <InnerItemList items={items} />
            <>
            {dropProvided.placeholder}
            </>
        </div>
      
    );
}

/**
 * wrapper to allow inner column act as
 * a droppable area for cards being dragged
 * @param param0 
 * @returns 
 */
export const KanbanDroppable = ({ title, droppableId, type, content }: {
    title: string,
    droppableId: string,
    type: string,
    content: any
} ) => {
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
        <Droppable
            droppableId={droppableId}
            type={type}
        >
            {(dropProvided: DroppableProvided, dropSnapshot: DroppableStateSnapshot) => (
                <div
                    style={getBackgroundColor(dropSnapshot)}
                    data-isdragging={dropSnapshot.isDraggingOver}
                    data-isdropdisabled={false}
                    data-isdraggingfrom={Boolean(dropSnapshot.draggingFromThisWith)}
                    {...dropProvided.droppableProps}
                >
                   
                        <InnerList 
                            items={content} 
                            title={title} 
                            dropProvided={dropProvided} 
                            dropSnapshot={dropSnapshot} 
                        />
                   
                </div>
            )}
        </Droppable>
    </>
    )
};

/**
 * wrapper to allow inner column act as
 * a droppable area for cards being dragged
 * @param param0 
 * @returns 
 */
export const EmptyKanbanDroppable = ({index,title, items}: {
    index: number;
    title: string;
    items: any;
})=> {
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
            { title.length > 0 &&
                <Draggable
                    key={title}
                    index={index}
                    draggableId={title}
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
                            className="flex flex-row w-fit h-full"
                            
                        >
                            { title.length > 0 ?
                                <>
                                   <header
                                        className={"flex flex-col gap-8 items-between text-center rounded-lg w-fit h-full px-2 py-4 bg-indianRed"}
                                        style={headerStyleChanger(snapshot, '#D95F5F')}
                                        data-isDragging={snapshot.isDragging}
                                    >
                                        <div
                                            className="flex flex-col items-center  gap-2"
                                        >
                                            <span className="rotate-180">
                                            <LeftArrowTailessIcon/>
                                            </span>
                                            <ThreeDotIcon/>
                                          
                                        </div>
                                        <div
                                            className="flex flex-col w-7 items-center gap-2.5 "
                                        >
                                            <div
                                                className="
                                                flex flex-col items-center justify-center px-[10px] text-xs py-1 text-white 
                                                bg-transparentWhite rounded-[20px]"
                                            >
                                                {items.length}
                                            </div>
                                            <div className="origin-top-right -translate-x-3/4 -rotate-90">
                                            <h2 
                                                className="text-base font-bold not-italic h-full text-white font-PlusJakartaSansBold capitalize"
                                                data-isDragging={snapshot.isDragging}
                                                {...provided.dragHandleProps}
                                                aria-label={`${title} quote list`}
                                            >
                                                {title}
                                            </h2>
                                            </div>
                                        </div>
                                        
                                    </header>
                                    <KanbanDroppable 
                                        title={title} 
                                        droppableId={title} 
                                        type={'TASK'} 
                                        content={items}                     
                                    />
                                </>
                                    : 
                                null
                            }
                        </div>
                    
                    )}
                </Draggable>
            }
        </>
    )
};

const KanbanDraggableHeader = ({title, items, snapshot, provided, backgroundColor}: {
    title: string,
    items: any,
    snapshot: DraggableStateSnapshot,
    backgroundColor: string,
    provided: DraggableProvided
}) => {
   
    return (
        <>
            <header
                className={"flex flex-row justify-between items-center rounded-lg px-4 py-2"}
                style={headerStyleChanger(snapshot, backgroundColor)}
                data-isDragging={snapshot.isDragging}
            >
                <div
                    className="flex flex-row gap-2.5 items-center"
                >
                    <h2 
                        className="text-base font-bold not-italic text-white font-PlusJakartaSansBold capitalize"
                        data-isDragging={snapshot.isDragging}
                        {...provided.dragHandleProps}
                        aria-label={`${title} quote list`}
                    >
                        {title}
                    </h2>
                    <div
                        className="
                        flex flex-col items-center justify-center px-[10px] text-xs py-1 text-white 
                        bg-transparentWhite rounded-[20px]"
                    >
                        {items.length}
                    </div>
                </div>
                <div
                    className="flex flex-row items-center gap-2"
                >
                    <ThreeDotIcon/>
                    <LeftArrowTailessIcon/>
                </div>
            </header>
        </>
    )
}

/**
 * column within the kanban board
 * @param param0 
 * @returns 
 */
const KanbanDraggable = ({index,title, items, backgroundColor}: {
    index: number;
    title: string;
    backgroundColor: any
    items: any;
}) => {

    
  
    return (
        <>
            { items.length > 0 &&
                <Draggable
                    key={title}
                    index={index}
                    draggableId={title}
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
                            className="flex flex-col gap-5 w-[325px]"
                            
                        >
                            { items.length > 0 ?
                                <>
                                    <KanbanDraggableHeader 
                                        title={title} 
                                        items={items} 
                                        snapshot={snapshot} 
                                        provided={provided}
                                        backgroundColor={backgroundColor}
                                    />
                                    <KanbanDroppable 
                                        title={title} 
                                        droppableId={title} 
                                        type={'TASK'} 
                                        content={items}                     
                                    />
                                </>
                                    : 
                                null
                            }

                        </div>
                    
                    )}
                </Draggable>
            }
        </>
    )
}

export default KanbanDraggable;
