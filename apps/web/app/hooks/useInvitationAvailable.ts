"use client"
import { useEffect, useState } from 'react'

export function useInvitationAvailable(invitations = []) {
    const [isAvailable, setIsAvailable] = useState(true);
    useEffect(() => {
        if (invitations.length > 0) {
            setIsAvailable(true);
        } else {
            setIsAvailable(false);
        }
    }, [invitations]);
    return { isAvailable }
}
