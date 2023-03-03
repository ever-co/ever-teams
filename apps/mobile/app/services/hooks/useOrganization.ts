import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showMessage } from "react-native-flash-message";
import { useStores } from "../../models";
import useFetchUserOrganization from "../client/queries/organizationTeam/organization";
import { createOrganizationTeamRequest, removeUserFromAllTeam, updateOrganizationTeamRequest } from "../client/requests/organization-team";
import { IOrganizationTeamList, OT_Member } from "../interfaces/IOrganizationTeam";
import useAuthenticateUser from "./features/useAuthentificateUser";


function useCreateOrganizationTeam() {
    const {
        authenticationStore: { tenantId, organizationId, authToken, user, employeeId },
        teamStore: { teams, setOrganizationTeams, setActiveTeamId, setActiveTeam }
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
        setActiveTeamId(data.id)
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
    const { teamStore: { activeTeamId, teams, setActiveTeam, setOrganizationTeams, activeTeam, setActiveTeamId },
        authenticationStore: { user, tenantId, authToken } } = useStores();
    const { logOut } = useAuthenticateUser();

    const [teamsFetching, setTeamsFetching] = useState(false)

    const { createOrganizationTeam, createTeamLoading } = useCreateOrganizationTeam();

    const [isTeamManager, setIsTeamManager] = useState(false);

    const { data: organizationTeams, isLoading } = useFetchUserOrganization({
        tenantId, authToken, userId: user?.id
    })

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
            setIsTeamManager(!!isM)
        }
    }



    const makeMemberAsManager = useCallback(async (employeeId: string) => {
        // Check if user is already manager
        const member: OT_Member = members.find((m) => m.employeeId === employeeId);

        if (member.role) {
            showMessage({
                message: "Info",
                description: "User is already manager",
                type: "warning"
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


        if (response.ok || response.status === 202) {
            showMessage({
                message: "Info",
                description: "The current user is now manager ! ",
                type: "success"
            })
        }
    }, [activeTeamId, isManager])


    const removeMember = useCallback(async (employeeId: string) => {

        const member = members.find((m) => m.employeeId === employeeId)
        const managerIds = members.filter((m) => m.role).map((t) => t.employeeId)

        // Verify if member is manager And Check if he is the only manager in the active team
        if (member && member.role && managerIds.length < 2) {
            showMessage({
                message: "Critical",
                description: "You're the only manager you can't remove account",
                type: "danger"
            })

            return
        }

        const newMembers = members.filter((m) => m.employeeId !== employeeId);
        const index = managerIds.indexOf(employeeId);
        if (index >= 0) {
            managerIds.splice(index, 1)
        }
        const team: IOrganizationTeamList = {
            ...activeTeam,
            members: newMembers,
            managerIds
        }

        setActiveTeam(team)

        const { data, response } = await updateOrganizationTeamRequest({
            datas: team,
            id: activeTeamId,
            bearer_token: authToken
        });


        if (response.ok || response.status === 202) {
            showMessage({
                message: "Info",
                description: "Member removed successfully ! ",
                type: "success"
            })
        }
    }, [activeTeam, isTeamManager])

    const removeUserFromAllTeams = useCallback(async (userId: string) => {
        const { data } = await removeUserFromAllTeam({
            userId,
            bearer_token: authToken,
            tenantId
        })
        return data
    }, [])


    // Load Teams
    useEffect(() => {
        if (!isLoading) {
            // If there no team, user will be logged out
            if (organizationTeams.total <= 0) {
                logOut();
                return
            }

            // UPDATE ACTIVE TEAM
            const updateActiveTeam = organizationTeams?.items.find((t) => t.id === activeTeamId) || organizationTeams.items[0]
            if (updateActiveTeam) {
                setActiveTeam(updateActiveTeam)
                setActiveTeamId(updateActiveTeam.id)
            }

            setOrganizationTeams(organizationTeams);
            setTeamsFetching(false)
        }
        isManager()
    }, [user, createTeamLoading, organizationTeams?.total, isLoading])


    return {
        removeUserFromAllTeams,
        isTeamManager,
        members,
        activeTeam,
        createOrganizationTeam,
        $otherMembers,
        currentUser,
        createTeamLoading,
        teamsFetching,
        makeMemberAsManager,
        removeMember
    }
}
