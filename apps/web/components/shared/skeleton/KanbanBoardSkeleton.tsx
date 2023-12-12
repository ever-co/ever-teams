import Skeleton from "react-loading-skeleton";

const KanbanBoardSkeleton = () => {

    let columns = Array.from(Array(3));

    let tasks = Array.from(Array(2));

    return (
        <>
            <div
                className="flex flex-row justify-center gap-[20px] w-full min-h-[600px] p-[32px] bg-transparent dark:bg-[#181920]"
            >
               {columns.map((_, index: number)=> {
                return (
                    <>
                    <div className="flex flex-col gap-[10px]" key={index}>
                        <Skeleton height={40} width={325} borderRadius={10} className="dark:bg-[#353741]" />

                        <div className="flex flex-col gap-[5px]">
                        {tasks.map((_, index: number)=> {
                            return (
                                <>
                                    <Skeleton key={index} height={155} width={325} borderRadius={10} className="dark:bg-[#353741]" />
                                </>
                            )
                        })} 

                            <Skeleton height={56} width={325} borderRadius={10} className="dark:bg-[#353741]" />
                        </div>
                    </div>
                    </>
                )
               })}                       
            </div>
        </>
    )
}

export default KanbanBoardSkeleton;