import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStores } from "../../models";
import { createOrganizationTeamRequest } from "../client/requests/organization-team";

// function useCreateOrganizationTeam() {
//     const {
//         authenticationStore: { tenantId, organizationId, employeeId, authToken },
//         teamStore: { teams, setOrganizationTeams, setActiveTeamId }
//     } = useStores();

//     const [loading, setLoading] = useState(false)
//     const teamsRef = useRef(teams);


//     teamsRef.current = useMemo(() => (teamsRef.current = teams), [teams]);

//     const createOrganizationTeam = useCallback(async (name: string) => {
//         const teams = teamsRef.current;
//         const $name = name.trim();
//         const exits = teams.find(
//             (t) => t.name.toLowerCase() === $name.toLowerCase()
//         );

//         if (exits || $name.length < 2) {
//             return Promise.reject(new Error('Invalid team name !'));
//         }
//         setLoading(true)
//         const { data } = await createOrganizationTeamRequest(
//             {
//                 name: $name,
//                 tenantId,
//                 organizationId,
//                 managerIds: [employeeId],
//             },
//             authToken
//         );
//         setLoading(false)
//         console.log(data)
//     },
//         [setLoading, setActiveTeamId, setOrganizationTeams]
//     );

//     return {
//         createOrganizationTeam,
//         loading,
//     };
// }

export function useOrganizationTeam() {
    const { teamStore: { activeTeam },
        authenticationStore: { user } } = useStores();

        const [isTeamManager, setIsTeamManager]=useState(false);

    const members = activeTeam?.members || [];

    const currentUser = members.find((m) => {
        return m.employee.userId === user?.id;
    });

    const $otherMembers = members.filter((m) => {
        return m.employee.userId !== user?.id;
    });

    const isManager =() => {
        if (activeTeam) {
            const $u = user;
            const isM = members.find((member) => {
                const isUser = member.employee.userId === $u?.id;
                return isUser && member.role && member.role.name === "MANAGER";
            });
            setIsTeamManager(isM)
            return false;
        } else {
            return false
        }
        return false
    }

    useEffect(()=>{
        isManager();
    },[activeTeam,user])

    return {
        isTeamManager,
        members,
        $otherMembers,
        currentUser
    }
}
