import BugIcon from "@components/ui/svgs/bug";
import VerticalThreeDot from "@components/ui/svgs/vertical-three-dot";

function getStyle(provided, style) {
    if (!style) {
      return provided.draggableProps.style;
    }
  
    return {
      ...provided.draggableProps.style,
      ...style,
    };
}

function Tag({title, backgroundColor, color}: {
    title: string,
    backgroundColor: string,
    color: string
}) {

    return (
        <>
            <div 
                className="flex flex-row gap-2 items-center py-1 px-2.5 rounded-xl"
                style={{
                    backgroundColor: `${backgroundColor}`
                }}
            >
               
                <p 
                    className={`text-xs `}
                    style={{
                        color: `${color}`
                    }}
                >{title}</p>
            </div>
        </>
    )
}

function TagList({tags}: {
    tags: any[]
}){
    return (
        <>
            <div className="flex flex-row flex-wrap gap-1 items-center">
                {tags.map((tag: any, index: number)=> {
                    return (
                        <Tag 
                            key={index}
                            title={tag.title} 
                            backgroundColor={tag.backgroundColor} 
                            color={tag.color}
                        />
                    )
                })}
            </div>
        </>
    )
}

/**
 * card that represent each task
 * @param props 
 * @returns 
 */
export default function Item(props: any) {
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
        className="flex flex-col rounded-2xl bg-white p-4"
        data-is-dragging={isDragging}
        data-testid={item.id}
        data-index={index}
        aria-label={`${item.status.name} ${item.content}`}
      >
        <div className="flex gap-1.5 border-b border-b-gray-200 pb-4">
            <div className="flex flex-col gap-5 grow">
                <TagList tags={item.tags}/>
                <div className="flex flex-row items-center gap-2 text-sm not-italic font-semibold">
                    <div className="bg-indianRed rounded p-1">
                        <BugIcon/>
                    </div>
                    <p className="text-grey">#213</p>
                    <p className="text-black capitalize">{item.content}</p>
                    
                </div>
            </div>
            <div className="flex flex-col w-[48px] items-end">
                <VerticalThreeDot/>
            </div>
        </div>
        <div className="flex flex-row justify-between items-center pt-4">
            <div className="flex flex-row items-center gap-2">
                <small className="text-[#7E7991] text-xs text-normal">Worked:</small>
                <p className="text-black font-medium text-sm">0 h 0 m </p>
            </div>
            <div>

            </div>
        </div>
      </section>
    );
}