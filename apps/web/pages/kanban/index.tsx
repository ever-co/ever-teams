import { withAuthentication } from "lib/app/authenticator";
import { KanbanView } from "lib/features/team-members-kanban-view"
import { MainLayout } from "lib/layout";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const Kanban= () => {
    const router = useRouter()
    const [winReady, setwinReady] = useState(false);
    console.log('ready ', router.isReady)
    useEffect(() => {
        setwinReady(true);
    }, []);
    return (
        <>
            {winReady ?
            <KanbanView/>
            : null
            }
        </>
    )
}

// export default withAuthentication(Kanban, { displayName: 'Kanban'});
export default Kanban;