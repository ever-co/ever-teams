import { useCallback, useEffect, useMemo, useState } from "react"
import { useStores } from "../../../models"
import isEqual from "lodash/isEqual"
import { useFetchMyInvitations } from "../../client/queries/invitation/invitations"
import { acceptRejectMyInvitationsRequest } from "../../client/requests/invite"
import { IMyInvitation } from "../../interfaces/IInvite"
import { useSyncRef } from "../useSyncRef"

export function useAcceptInviteModal() {
	const {
		authenticationStore: { tenantId, authToken },
	} = useStores()
	const [openModal, setOpenModal] = useState(false)
	const [myInvitions, setMyInvitations] = useState<IMyInvitation[]>([])
	const myInvitationsRef = useSyncRef(myInvitions)
	const { data, isLoading, isRefetching, isSuccess } = useFetchMyInvitations({
		tenantId,
		authToken,
	})

	const closeModal = () => {
		setOpenModal(false)
	}

	const onOpenModal = () => {
		setOpenModal(true)
	}

	const onAcceptInvitation = useCallback(async (invitationId: string) => {
		return await acceptRejectMyInvitationsRequest(tenantId, authToken, invitationId, "ACCEPTED")
			.then(closeModal)
			.catch(closeModal)
	}, [])

	const onRejectInvitation = useCallback(async (invitationId: string) => {
		return await acceptRejectMyInvitationsRequest(tenantId, authToken, invitationId, "REJECTED")
			.then(closeModal)
			.catch(closeModal)
	}, [])

	const activeInvitation = useMemo(
		() => myInvitions[0] || null,
		[myInvitions, data, onAcceptInvitation, onRejectInvitation],
	)

	useEffect(() => {
		if (isSuccess) {
			const latestInvitations = data.items || []

			const latestInvitationsSorted = latestInvitations
				.slice()
				.sort((a, b) => a.id.localeCompare(b.id))

			const myInvitationsRefSorted = myInvitationsRef.current
				.slice()
				.sort((a, b) => a.id.localeCompare(b.id))

			if (!isEqual(latestInvitationsSorted, myInvitationsRefSorted)) {
				setMyInvitations(data.items)
			}

			if (activeInvitation && data.total > 0) {
				onOpenModal()
			} else {
				closeModal()
			}
		}
	}, [isLoading, isRefetching])

	return {
		openModal,
		closeModal,
		myInvitions,
		activeInvitation,
		onAcceptInvitation,
		onRejectInvitation,
	}
}
