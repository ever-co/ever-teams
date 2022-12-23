import { useCallback, useMemo, useRef, useState } from "react";
import { useStores } from "../../models";
import { createOrganizationTeamRequest } from "../client/requests/organization-team";

function useCreateOrganizationTeam() {
    const {
        authenticationStore: { tenantId, organizationId, employeeId, authToken },
        teamStore: { teams, setOrganizationTeams, setActiveTeamId }
    } = useStores();

    const [loading, setLoading] = useState(false)
    const teamsRef = useRef(teams);


    teamsRef.current = useMemo(() => (teamsRef.current = teams), [teams]);

    const createOrganizationTeam = useCallback(async (name: string) => {
        const teams = teamsRef.current;
        const $name = name.trim();
        const exits = teams.find(
            (t) => t.name.toLowerCase() === $name.toLowerCase()
        );

        if (exits || $name.length < 2) {
            return Promise.reject(new Error('Invalid team name !'));
        }
        setLoading(true)
        const { data } = await createOrganizationTeamRequest(
            {
                name: $name,
                tenantId,
                organizationId,
                managerIds: [employeeId],
            },
            authToken
        );
        setLoading(false)
        console.log(data)
    },
        [setLoading, setActiveTeamId, setOrganizationTeams]
    );

    return {
        createOrganizationTeam,
        loading,
    };
}

// export function useOrganizationTeams() {
//     const { loading, queryCall } = useQuery(getOrganizationTeamsAPI);
//     const [teams, setTeams] = useRecoilState(organizationTeamsState);
//     const activeTeam = useRecoilValue(activeTeamState);
//     const [activeTeamId, setActiveTeamId] = useRecoilState(activeTeamIdState);
//     const [teamsFetching, setTeamsFetching] = useRecoilState(teamsFetchingState);
//     const { firstLoad, firstLoadData: firstLoadTeamsData } = useFirstLoad();

//     const { createOrganizationTeam, loading: createOTeamLoading } =
//         useCreateOrganizationTeam();

//     useEffect(() => {
//         setTeamsFetching(loading);
//     }, [loading, setTeamsFetching]);

//     const loadTeamsData = useCallback(() => {
//         setActiveTeamId(getActiveTeamIdCookie());
//         return queryCall().then((res) => {
//             setTeams(res.data?.items || []);
//             return res;
//         });
//     }, [queryCall, setActiveTeamId, setTeams]);

//     const setActiveTeam = useCallback(
//         (teamId: typeof teams[0]) => {
//             setActiveTeamIdCookie(teamId.id);
//             setOrganizationIdCookie(teamId.organizationId);
//             // This must be called at the end (Update store)
//             setActiveTeamId(teamId.id);
//         },
//         [setActiveTeamId]
//     );

//     useEffect(() => {
//         if (activeTeamId && firstLoad) {
//             getOrganizationTeamAPI(activeTeamId).then((res) => {
//                 const members = res.data?.members;
//                 const id = res.data.id;
//                 if (!members) return;

//                 // Update active teams fields with from team Status API
//                 setTeams((tms) => {
//                     const idx_tm = tms.findIndex((t) => t.id === id);
//                     if (idx_tm < 0) return tms;
//                     const new_tms = [...tms];
//                     new_tms[idx_tm] = { ...new_tms[idx_tm] };
//                     const new_members = [...new_tms[idx_tm].members];
//                     // merges status fields for a members
//                     new_members.forEach((mem, i) => {
//                         const new_mem = members.find((m) => m.id === mem.id);
//                         if (!new_mem) return;
//                         new_members[i] = { ...mem, ...new_mem };
//                     });
//                     // Update members for a team
//                     new_tms[idx_tm].members = new_members;
//                     return new_tms;
//                 });
//             });
//         }
//     }, [activeTeamId, firstLoad, setTeams]);

//     return {
//         loadTeamsData,
//         loading,
//         teams,
//         teamsFetching,
//         activeTeam,
//         setActiveTeam,
//         createOrganizationTeam,
//         createOTeamLoading,
//         firstLoadTeamsData,
//     };
// }
