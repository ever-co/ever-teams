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

// this function changes column header color when dragged
function headerStyleChanger(snapshot: DraggableStateSnapshot){
    const backgroundColor = snapshot.isDragging ? '#000' : '#fff';

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
    dropProvided: any
}) {
    const { quotes, dropProvided } = props;
    const title = props.title ? <h2>{props.title}</h2> : null;
  
    return (
      <section>
        <div ref={dropProvided.innerRef}>
          <InnerQuoteList quotes={quotes} />
          {dropProvided.placeholder}
        </div>
      </section>
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
                    style={style}
                    isDraggingOver={dropSnapshot.isDraggingOver}
                    isDropDisabled={false}
                    isDraggingFrom={Boolean(dropSnapshot.draggingFromThisWith)}
                    {...dropProvided.droppableProps}
                >
                    <section
                        style={{
                            overflowX: 'hidden',
                            overflowY: 'auto',
                            maxHeight: '50px'
                        }}
                    >
                        <InnerList quotes={content} title={title} dropProvided={dropProvided} />
                    </section>
                </div>
            )}
        </Droppable>
    </>
    )
};

const KanbanDraggable = ({key, index, draggableId, title, content}: {
    key: string;
    index: number;
    draggableId: string;
    title: string;
    content: any[];
}) => {
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
                        className="flex flex-col gap-2 w-60"
                    >
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
                                backgroundColor: snapshot.isDragging ? '#fff' : null,
                              }}   
                            content={content}                     
                        />
                    </div>
                )}
            </Draggable>
        </>
    )
}

export default KanbanDraggable;
