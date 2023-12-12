import React from "react";
import Skeleton from "react-loading-skeleton";

const KanbanBoardSkeleton = () => {

    const columns = Array.from(Array(3));

    const tasks = Array.from(Array(2));

    return (
        <>
            <div
                className="flex flex-row justify-center gap-[20px] w-full min-h-[600px] p-[32px] bg-transparent dark:bg-[#181920]"
            >
               {columns.map((_, index: number)=> {
                return (
                    <React.Fragment key={index}>
                        <div className="flex flex-col gap-[10px]">
                            <Skeleton height={40} width={325} borderRadius={10} className="dark:bg-[#353741]" />

                            <div className="flex flex-col gap-[5px]">
                                {tasks.map((_, index: number)=> {
                                    return (
                                        <React.Fragment key={index}>
                                            <Skeleton height={155} width={325} borderRadius={10} className="dark:bg-[#353741]" />
                                        </React.Fragment>
                                    )
                                })} 

                                <Skeleton height={56} width={325} borderRadius={10} className="dark:bg-[#353741]" />
                            </div>
                        </div>
                    </React.Fragment>
                )
               })}                       
            </div>
        </>
    )
}

export default KanbanBoardSkeleton;