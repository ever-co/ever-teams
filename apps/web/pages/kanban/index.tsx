import { KanbanTabs } from "@app/constants";
import { useKanban } from "@app/hooks/features/useKanban";
import { clsxm } from "@app/utils";
import KanbanBoardSkeleton from "@components/shared/skeleton/KanbanBoardSkeleton";
import VerticalLine from "@components/ui/svgs/vertificalline";
import { withAuthentication } from "lib/app/authenticator";
import { Breadcrumb, Container } from "lib/components";
import { stackImages } from "lib/components/kanban-card";
import { AddIcon } from "lib/components/svgs";
import { KanbanView } from "lib/features/team-members-kanban-view"
import { MainLayout } from "lib/layout";
import Image from 'next/image';
import { useState } from "react";

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
    const [activeTab, setActiveTab] = useState(KanbanTabs.TODAY);

    const imageRadius = 20;
    const numberOfImagesDisplayed = 4;
    const totalLength = ((images.length+1) * imageRadius);
   
    return (
        <>
        <MainLayout>
            <div className={clsxm('relative bg-white dark:bg-dark--theme pt-20 -mt-8 ')}>
                <Container>
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
                    <div className="relative flex flex-row justify-between items-center mt-[36px]">
                        <div className="flex flex-row">
                            <div onClick={()=> {
                                setActiveTab(KanbanTabs.TODAY)
                            }} className="pt-2.5 px-5 pb-[30px] text-base font-bold" style={{
                                borderBottomWidth: '3px',
                                borderBottomStyle: 'solid',
                                borderBottomColor: activeTab === KanbanTabs.TODAY ? '#3826A6' : '#FFFFFF',
                                color: activeTab ===  KanbanTabs.TODAY ? '#3826A6' : '#000000',
                            }}>
                                Today
                            </div>
                            <div onClick={()=> {
                                setActiveTab(KanbanTabs.YESTERDAY)
                            }} className="pt-2.5 px-5 pb-[30px] text-base font-bold" style={{
                                borderBottomWidth: '3px',
                                borderBottomStyle: 'solid',
                                borderBottomColor: activeTab === KanbanTabs.YESTERDAY ? '#3826A6' : '#FFFFFF',
                                color: activeTab ===  KanbanTabs.YESTERDAY ? '#3826A6' : '#000000',
                            }}>
                                Yesterday
                            </div>
                            <div onClick={()=> {
                                setActiveTab(KanbanTabs.TOMORROW)
                            }} className="pt-2.5 px-5 pb-[30px] text-base font-bold" style={{
                                borderBottomWidth: '3px',
                                borderBottomStyle: 'solid',
                                borderBottomColor: activeTab === KanbanTabs.TOMORROW ? '#3826A6' : '#FFFFFF',
                                color: activeTab ===  KanbanTabs.TOMORROW ? '#3826A6' : '#000000',
                            }}>
                                Tomorrow
                            </div>
                        </div>
                        <div>

                        </div>
                    </div>
                </Container>
            </div>
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
