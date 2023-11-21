import React from 'react';
import { useEffect, useState } from 'react';
import { Draggable, DraggableProvided, DraggableStateSnapshot, Droppable } from 'react-beautiful-dnd';

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

function getStyle(provided, style) {
    if (!style) {
      return provided.draggableProps.style;
    }
  
    return {
      ...provided.draggableProps.style,
      ...style,
    };
}

const getBackgroundColor = (isDraggingOver, isDraggingFrom) => {
    if (isDraggingOver) {
      return {
        backgroundColor: '#FFEBE6',
        height: '150px'
    }
    }
    if (isDraggingFrom) {
      return {
        backgroundColor:  '#E6FCFF',
        height: '150px'
    }
    }
    return {
        backgroundColor:  '#EBECF0',
        height: '150px'
    }
};

// this function changes column header color when dragged
function headerStyleChanger(snapshot: DraggableStateSnapshot){
    const backgroundColor = snapshot.isDragging ? '#0000ee' : '#fffee';

    return {
        backgroundColor
    }
}


/**
 * card that represent each task
 * @param props 
 * @returns 
 */
function Item(props: any) {
    const {
      item,
      isDragging,
      isGroupedOver,
      provided,
      style,
      isClone,
      index,
    } = props;
  
    return (
      <section
        href={``}
        isDragging={isDragging}
        isGroupedOver={isGroupedOver}
        isClone={isClone}
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        style={getStyle(provided, style)}
        data-is-dragging={isDragging}
        data-testid={item.id}
        data-index={index}
        aria-label={`${item.status.name} ${item.content}`}
      >
        {item.content}
      </section>
    );
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
        {items.map((item: any, index: number) => (
            <Draggable key={item.id} draggableId={item.id} index={index}>
                {(dragProvided, dragSnapshot) => (
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
    </>
)};

/**
 * inner column within a kanaban column,
 * it holds all cards underneath the name of the column
 * @param props 
 * @returns 
 */
function InnerList(props: {
    title: string, 
    items: any,
    dropProvided: any,
    dropSnapshot: any
}) {
    const { items, dropProvided, dropSnapshot } = props;
  
    return (
   
        <div 
        style={getBackgroundColor(dropSnapshot.isDraggingOver, dropSnapshot.draggingFromThisWith)}
        ref={dropProvided.innerRef}>
          <InnerItemList items={items} />
          {dropProvided.placeholder}
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
            {(dropProvided, dropSnapshot) => (
                <div
                    style={getBackgroundColor(dropSnapshot.isDraggingOver, dropSnapshot.draggingFromThisWith)}
                    isDraggingOver={dropSnapshot.isDraggingOver}
                    isDropDisabled={false}
                    isDraggingFrom={Boolean(dropSnapshot.draggingFromThisWith)}
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
 * column within the kanban board
 * @param param0 
 * @returns 
 */
const KanbanDraggable = ({index,title, items}: {
    index: number;
    title: string;
    items: any;
}) => {

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
                            className="flex flex-col gap-2 w-60"
                            
                        >
                            { title.length > 0 ?
                                <>
                                    <header
                                        className="flex flex-row justify-center items-center h-10 bg-primary"
                                        style={headerStyleChanger(snapshot)}
                                        isDragging={snapshot.isDragging}
                                    >
                                        <h2 
                                            isDragging={snapshot.isDragging}
                                            {...provided.dragHandleProps}
                                            aria-label={`${title} quote list`}
                                        >
                                            {title}
                                        </h2>
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
}

export default KanbanDraggable;
