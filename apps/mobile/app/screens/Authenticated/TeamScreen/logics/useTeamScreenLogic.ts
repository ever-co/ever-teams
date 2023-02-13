import React, { useEffect, useState } from "react"
import { showMessage } from "react-native-flash-message"
import { EMAIL_REGEX } from "../../../../helpers/regex"
const useTeamScreenLogic = () => {
    const [taskList] = React.useState(["success", "danger", "warning"])
    const [showMoreMenu, setShowMoreMenu] = React.useState(false)
    const [showInviteModal, setShowInviteModal] = React.useState(false)
    const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false)
    const [isLoading, setIsLoading] = useState(true)

    const [memberName, setMemberName] = useState("")
    const [memberEmail, setMemberEmail] = useState("");
    const [errors, setErrors] = useState({
        emailError: "",
        nameError: ""
    })

    const handleEmailInput = (email: string) => {
       
        if (email.trim().length == 0 || !email.match(EMAIL_REGEX)) {
            setErrors({ ...errors, emailError: "Email is not valid" })
            return
        } else {
            setErrors({ ...errors, emailError: null })
            setMemberEmail(email)
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
        isLoading
    }
}

export default useTeamScreenLogic;