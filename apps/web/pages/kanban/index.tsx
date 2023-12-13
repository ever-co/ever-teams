import { useKanban } from "@app/hooks/features/useKanban";
import KanbanBoardSkeleton from "@components/shared/skeleton/KanbanBoardSkeleton";
import VerticalLine from "@components/ui/svgs/vertificalline";
import { withAuthentication } from "lib/app/authenticator";
import { Breadcrumb } from "lib/components";
import { KanbanView } from "lib/features/team-members-kanban-view"
import { MainHeader, MainLayout } from "lib/layout";

const Kanban= () => {
  
    const { data } = useKanban();
   
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
                        <p>08:00 ( UTC +04:30 )</p>
                        <VerticalLine/>
                        <p>08:00 ( UTC +04:30 )</p>
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
