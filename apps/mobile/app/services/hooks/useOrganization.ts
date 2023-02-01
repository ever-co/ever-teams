import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showMessage } from "react-native-flash-message";
import { useStores } from "../../models";
import { ITeamsOut } from "../../models/team/team";
import { getUserOrganizationsRequest } from "../client/requests/organization";
import { createOrganizationTeamRequest, getAllOrganizationTeamRequest, updateOrganizationTeamRequest } from "../client/requests/organization-team";
import { IUserOrganization } from "../interfaces/IOrganization";
import { IOrganizationTeamList, OT_Member } from "../interfaces/IOrganizationTeam";

function useCreateOrganizationTeam() {
    const {
        authenticationStore: { tenantId, organizationId, employeeId, authToken },
        teamStore: { teams, setOrganizationTeams, activeTeamId, setActiveTeamId }
    } = useStores();

    const [createTeamLoading, setCreateTeamLoading] = useState(false)
    const teamsRef = useRef(teams);


    teamsRef.current = useMemo(() => (teamsRef.current = teams), [teams]);

    const createOrganizationTeam = useCallback(async (name: string) => {
        const teams = teamsRef.current.items;
        const $name = name.trim();
        const exits = teams.find(
            (t) => t.name.toLowerCase() === $name.toLowerCase()
        );

        if (exits || $name.length < 2) {
            return {
                error: "Invalid team name"
            }
        }

        setCreateTeamLoading(true)

        const { data } = await createOrganizationTeamRequest(
            {
                name: $name,
                tenantId,
                organizationId,
                managerIds: [employeeId],
            },
            authToken
        );

        setCreateTeamLoading(false)
        return data
    },
        [setCreateTeamLoading, setActiveTeamId, setOrganizationTeams]
    );

    return {
        createOrganizationTeam,
        createTeamLoading,
    };
}

export function useOrganizationTeam() {
    const { teamStore: { activeTeamId, teams, setActiveTeam, setOrganizationTeams, activeTeam },
        authenticationStore: { user, tenantId, authToken } } = useStores();

    const [teamsFetching, setTeamsFetching] = useState(false)

    const { createOrganizationTeam, createTeamLoading } = useCreateOrganizationTeam();

    const [isTeamManager, setIsTeamManager] = useState(false);

    // const activeTeam = useMemo(() => teams.items.find((t) => t.id === activeTeamId), [activeTeamId])

    const members = activeTeam?.members || [];

    const currentUser = members.find((m) => {
        return m.employee.userId === user?.id;
    });

    const $otherMembers = members.filter((m) => {
        return m.employee.userId !== user?.id;
    });

    const isManager = () => {
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

    // Load organization teams

    const loadingTeams = useCallback(async () => {
        setTeamsFetching(true)
        const { data: organizations } = await getUserOrganizationsRequest(
            { tenantId, userId: user?.id },
            authToken
        );

        const organizationsItems = organizations.items;

        const filteredOrganization = organizationsItems.reduce((acc, org) => {
            if (!acc.find((o) => o.organizationId === org.organizationId)) {
                acc.push(org);
            }
            return acc;
        }, [] as IUserOrganization[]);


        const call_teams = filteredOrganization.map((item) => {
            return getAllOrganizationTeamRequest(
                { tenantId, organizationId: item.organizationId },
                authToken
            );
        });

        const data: ITeamsOut = await Promise.all(call_teams).then((tms) => {
            return tms.reduce(
                (acc, { data }) => {
                    acc.items.push(...data.items);
                    acc.total += data.total;
                    return acc;
                },
                { items: [] as IOrganizationTeamList[], total: 0 }
            );
        });

        // UPDATE ACTIVE TEAM
        if (activeTeamId) {
            const updateActiveTeam = data.items.find((t) => t.id === activeTeamId)
            setActiveTeam(updateActiveTeam)
        }

        setOrganizationTeams(data);
        setTeamsFetching(false)

    }, [])


    const makeMemberAsManager = useCallback(async (employeeId: string) => {
        // Check if user is already manager
        const member: OT_Member = members.find((m) => m.employeeId === employeeId);

        if (member.role) {
            showMessage({
                message:"Info",
                description:"User is already manager",
                type:"warning"
            })
            return
        }

        const managerIds = members.filter((m) => m.role).map((t) => t.employeeId)
        managerIds.push(employeeId)

        const team: IOrganizationTeamList = {
            ...activeTeam,
            managerIds,
        }

        const { data, response } = await updateOrganizationTeamRequest({
            datas: team,
            id: activeTeamId,
            bearer_token: authToken
        });
        await loadingTeams();

        if(response.ok || response.status===202){
            showMessage({
                message:"Info",
                description:"The current user is now manager ! ",
                type:"success"
            })
        }
    }, [activeTeamId, isManager])


    // Load Teams
    useEffect(() => {
        isManager();
        loadingTeams()
    }, [user, createTeamLoading, updateOrganizationTeamRequest])

    return {
        loadingTeams,
        isTeamManager,
        members,
        activeTeam,
        createOrganizationTeam,
        $otherMembers,
        currentUser,
        createTeamLoading,
        teamsFetching,
        makeMemberAsManager
    }
}
