import { withAuthentication } from "lib/app/authenticator";
import { KanbanView } from "lib/features/team-members-kanban-view"
import { MainLayout } from "lib/layout";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const Kanban= () => {
    const router = useRouter()
    const [winReady, setwinReady] = useState(false);

    const todo = {
        id: 'status-1',
        name: 'TODO'
    }

    const ongoing = {
        id: 'status-2',
        name: 'ONGOING'
    }

    const review = {
        id: 'status-3',
        name: 'REVIEW'
    }

    const done = {
        id: 'status-4',
        name: 'DONE'
    }
    // this array holds all the columns
    const status = [todo, ongoing, review, done];

    const demoData = [
        {
            id: '1',
            content: 'demo content',
            status: todo
        }, 
        {
            id: '2',
            content: 'another content',
            status: ongoing
        },
        {
            id: '3',
            content: 'a simple tes',
            status: review
        }
    ]

    useEffect(() => {
        if(demoData.length > 0) {
            setwinReady(true);
        }
       
    }, [router.isReady, demoData]);

    return (
        <>
           {winReady ? 
            <KanbanView itemsArray={demoData} columns={status}/>
            :
            null
           }
            
        </>
    )
}

// export default withAuthentication(Kanban, { displayName: 'Kanban'});
export default Kanban;

