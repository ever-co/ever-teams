import { useKanban } from "@app/hooks/features/useKanban";
import KanbanBoardSkeleton from "@components/shared/skeleton/KanbanBoardSkeleton";
import VerticalLine from "@components/ui/svgs/vertificalline";
import { withAuthentication } from "lib/app/authenticator";
import { Breadcrumb } from "lib/components";
import { stackImages } from "lib/components/kanban-card";
import { AddIcon } from "lib/components/svgs";
import { KanbanView } from "lib/features/team-members-kanban-view"
import { MainHeader, MainLayout } from "lib/layout";
import Image from 'next/image';

const images: any[] = [
    {
        src: '/assets/cover/auth-bg-cover-dark.png',
        title: 'profile'
    },
    {
        src: '/assets/cover/auth-bg-cover-dark.png',
        title: 'profile'
    },
    {
        src: '/assets/cover/auth-bg-cover-dark.png',
        title: 'profile'
    },
    {
        src: '/assets/cover/auth-bg-cover-dark.png',
        title: 'profile'
    },
    {
        src: '/assets/cover/auth-bg-cover-dark.png',
        title: 'profile'
    }
]

const Kanban= () => {
  
    const { data } = useKanban();

    const imageRadius = 20;
    const numberOfImagesDisplayed = 4;
    const totalLength = ((images.length+1) * imageRadius);
   
    return (
        <>
        <MainLayout>
            <MainHeader>
				<Breadcrumb paths={['Dashboard', 'Team Page']} className="text-sm" />
                <div className="flex flex-row items-center justify-between mt-[24px]">
                    <div>
                        <h1 className="text-[35px] font-bold text-[#282048] dark:text-white">Kanban Board</h1>
                    </div>
                    <div className="flex flex-row items-center gap-[12px]">
                        <p>08:00 ( UTC +04:30 )</p>
                        <VerticalLine/>
                        <div className="relative ">
                            <div className="flex h-fit flex-row justify-end items-center relative " style={{
                                width: `${totalLength}px`
                            }}>
                                {images.map((image: any, index: number)=> {
                                   
                                    if(index < numberOfImagesDisplayed) {
                                        return (
                                        <Image 
                                            key={index}
                                            src={image.src} 
                                            alt={image.title} 
                                            height={imageRadius*2} 
                                            width={imageRadius*2} 
                                            className="absolute rounded-full border-2 border-white"
                                            style={stackImages(index, images.length)}
                                        />)
                                    }
                                    
                                })}
                                {(images.length > 4) && (
                                    <div className="flex flex-row text-sm text-[#282048] dark:text-white font-semibold items-center justify-center absolute h-[40px] w-[40px] rounded-full border-2 border-[#0000001a] dark:border-white bg-white dark:bg-[#191A20]" style={stackImages(4, images.length)}>
                                        {images.length - numberOfImagesDisplayed}+
                                    </div>
                                )}
                            </div>
                        </div>
                        <VerticalLine/>
                        <button className="p-2 rounded-full border-2 border-[#0000001a] dark:border-white" onClick={()=> {}}>
                            <AddIcon width={24} height={24} className={"dark:stroke-white"}/>
                        </button>
                    </div>
                </div>
			</MainHeader>
           {Object.keys(data).length > 0 ? 
            <KanbanView kanbanBoardTasks={data}/>
            :
            <KanbanBoardSkeleton/>
           }
        </MainLayout>
        </>
    )
}

export default withAuthentication(Kanban, { displayName: 'Kanban'});
