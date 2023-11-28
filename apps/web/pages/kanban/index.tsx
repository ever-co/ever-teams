import { withAuthentication } from "lib/app/authenticator";
import { KanbanView } from "lib/features/team-members-kanban-view"
import { MainLayout } from "lib/layout";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const todo = {
    id: 'status-1',
    name: 'TODO',
    backgroundColor: '#8154BA',
}

const ongoing = {
    id: 'status-2',
    name: 'ONGOING',
    backgroundColor: '#D7EBDF',
}

const review = {
    id: 'status-3',
    name: 'REVIEW',
    backgroundColor: '#EAD2D5',
}

export const state = [ todo, ongoing, review]

const demoData = {
    todo: [
        {
            id: '1',
            content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
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

const Kanban= () => {
    const router = useRouter()
    const [winReady, setwinReady] = useState(false);

    useEffect(() => {
 
            setwinReady(true);
       
       
    }, [router.isReady]);

    return (
        <>
        <MainLayout>
           {winReady ? 
            <KanbanView itemsArray={demoData}/>
            :
            null
           }
        </MainLayout>
        </>
    )
}

export default withAuthentication(Kanban, { displayName: 'Kanban'});
