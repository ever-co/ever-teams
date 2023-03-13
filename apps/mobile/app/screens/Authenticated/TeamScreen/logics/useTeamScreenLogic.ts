import React, { useEffect, useState } from "react"
import { showMessage } from "react-native-flash-message"
import { EMAIL_REGEX } from "../../../../helpers/regex"
import { useUser } from "../../../../services/hooks/features/useUser"
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization"
import { useTeamInvitations } from "../../../../services/hooks/useTeamInvitation"
const useTeamScreenLogic = () => {
    const [taskList] = React.useState(["success", "danger", "warning"])
    const [showMoreMenu, setShowMoreMenu] = React.useState(false)
    const [showInviteModal, setShowInviteModal] = React.useState(false)
    const [emailsSuggest, setEmailSuggests] = useState<string[]>([])
    const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false)
    const [isLoading, setIsLoading] = useState(true)

    const { allUsers } = useUser();
    const { members } = useOrganizationTeam()
    const { teamInvitations } = useTeamInvitations();

    const [memberName, setMemberName] = useState("")
    const [memberEmail, setMemberEmail] = useState("");
    const [errors, setErrors] = useState({
        emailError: "",
        nameError: ""
    })

    const handleEmailInput = (email: string) => {

        if (email.length === 0) {
            setEmailSuggests([])
            setMemberEmail("")
            return
        }
        // Filter emails
        const matchList = allUsers.filter((u) => u.email.startsWith(email))
        const filteredEmails = matchList.map((u) => u.email)
        setEmailSuggests(filteredEmails)

        if (!email.match(EMAIL_REGEX)) {
            setMemberEmail(email)
            setErrors({ ...errors, emailError: "Email is not valid" })
        }
        else {
            // Check if this email is already used in the current team
            const existedMember = members.find((m) => m.employee.user.email === email)
            // Check if an invite was already sent to this email from the current team
            const existedInvite = teamInvitations.find((inv) => inv.email === email)

            if (existedMember) {
                setErrors({ ...errors, emailError: "Email already existed in this team" })
            }
            else if (existedInvite) {
                setErrors({ ...errors, emailError: "Invite already sent to this email" })
            }
            else {
                setErrors({ ...errors, emailError: null })
            }
            setMemberEmail(email)
            setEmailSuggests([])
        }
    }

    const handleNameInput = (name: string) => {
        if (name.trim().length < 3) {
            setErrors({ ...errors, nameError: "Name is not valid" })
            return
        } else {
            setErrors({ ...errors, nameError: null })
            setMemberName(name)
        }
    }

    useEffect(() => {
        setTimeout(() => setIsLoading(false), 3000);
    }, [])


    return {
        showInviteModal,
        showCreateTeamModal,
        showMoreMenu,
        setShowCreateTeamModal,
        setShowInviteModal,
        setShowMoreMenu,
        handleEmailInput,
        handleNameInput,
        memberEmail,
        memberName,
        setMemberEmail,
        setMemberName,
        setErrors,
        errors,
        isLoading,
        emailsSuggest,
        setEmailSuggests
    }
}

export default useTeamScreenLogic;