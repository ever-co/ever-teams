import { withAuthentication } from "lib/app/authenticator";
import { KanbanView } from "lib/features/team-members-kanban-view"
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

    const demoData = {
        todo: [
            {
                id: '1',
                content: 'demo content',
                tags: [
                    {
                        id: 'tag-1',
                        title: 'User Profile',
                        backgroundColor: '#8154BA',
                        color: '#fff'
                    },
                    {
                        id: 'tag-2',
                        title: 'BackEnd',
                        backgroundColor: '#EAD2D5',
                        color: '#DD2F44'
                    },
                ],
                status: todo
            },
            {
                id: '4',
                content: 'demo content2',
                tags: [
                    {
                        id: 'tag-1',
                        title: 'User Profile',
                        backgroundColor: '#D7EBDF',
                        color: '#3D9360'
                    },
                    {
                        id: 'tag-2',
                        title: 'BackEnd',
                        backgroundColor: '#EAD9EE',
                        color: '#9641AB'
                    },
                ],
                status: todo
            }
        ],
        ongoing: [
            {
                id: '2',
                content: 'another content',
                tags: [
                    {
                        id: 'tag-1',
                        title: 'User Profile',
                        backgroundColor: '#EAD9EE',
                        color: '#9641AB'
                    },
                    {
                        id: 'tag-2',
                        title: 'BackEnd',
                        backgroundColor: '#EAD2D5',
                        color: '#DD2F44'
                    },
                ],
                status: ongoing
            },
            {
                id: '5',
                content: 'another content2',
                tags: [
                    {
                        id: 'tag-1',
                        title: 'User Profile',
                        backgroundColor: '#8154BA',
                        color: '#fff'
                    },
                    {
                        id: 'tag-2',
                        title: 'BackEnd',
                        backgroundColor: '#D7EBDF',
                        color: '#3D9360'
                    },
                ],
                status: ongoing
            }
        ],
        review: [
            {
                id: '3',
                content: 'a simple tes',
                tags: [
                    {
                        id: 'tag-1',
                        title: 'User Profile',
                        backgroundColor: '#D7EBDF',
                        color: '#3D9360'
                    },
                    {
                        id: 'tag-2',
                        title: 'BackEnd',
                        backgroundColor: '#D7EBDF',
                        color: '#3D9360'
                    },
                ],
                status: review
            },
            {
                id: '6',
                content: 'a simple tes',
                tags: [
                    {
                        id: 'tag-1',
                        title: 'User Profile',
                        backgroundColor: '#D7EBDF',
                        color: '#3D9360'
                    },
                    {
                        id: 'tag-2',
                        title: 'BackEnd',
                        backgroundColor: '#D7EBDF',
                        color: '#3D9360'
                    },
                ],
                status: review
            }
        ]}

    useEffect(() => {
        if(demoData.ongoing.length > 0 && demoData.todo.length > 0 && demoData..length > 0) {
            setwinReady(true);
        }
       
    }, [router.isReady]);

    return (
        <>
           {winReady ? 
            <KanbanView itemsArray={demoData}/>
            :
            null
           }
            
        </>
    )
}

export default withAuthentication(Kanban, { displayName: 'Kanban'});

