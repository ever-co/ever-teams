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

export const getBackgroundColor = (isDraggingOver, isDraggingFrom) => {
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

function QuoteItem(props: any) {
    const {
      quote,
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
        data-testid={quote.id}
        data-index={index}
        aria-label={`${quote.status.name} quote ${quote.content}`}
      >
        {quote.content}
      </section>
    );
  }

function InnerQuoteList({quotes}: {
    quotes: any[]
}) {
    return (
        <>
        {quotes.map((quote, index) => (
            <Draggable key={quote.id} draggableId={quote.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                <QuoteItem
                    key={quote.id}
                    quote={quote}
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

function InnerList(props: {
    title: string, 
    quotes: any[],
    dropProvided: any,
    dropSnapshot: any
}) {
    const { quotes, dropProvided, dropSnapshot } = props;
  
    return (
   
        <div 
        style={getBackgroundColor(dropSnapshot.isDraggingOver, dropSnapshot.draggingFromThisWith)}
        ref={dropProvided.innerRef}>
          <InnerQuoteList quotes={quotes} />
          {dropProvided.placeholder}
        </div>
      
    );
}

export const KanbanDroppable = ({ title, droppableId, type, style, content }: {
    title: string,
    droppableId: string,
    type: string,
    style: any,
    content: any[]
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
                   
                        <InnerList quotes={content} title={title} dropProvided={dropProvided} dropSnapshot={dropSnapshot} />
                   
                </div>
            )}
        </Droppable>
    </>
    )
};

const KanbanDraggable = ({index,title, content}: {
    index: number;
    title: string;
    content: any;
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
                                        style={{
                                            backgroundColor: snapshot.isDragging ? '#000' : 'null',
                                        }}   
                                        content={content}                     
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
