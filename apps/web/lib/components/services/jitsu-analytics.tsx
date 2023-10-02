import {IUser} from "@app/interfaces";
import {useJitsu} from "@jitsu/jitsu-react";
import {useRouter} from "next/router";
import React, {useEffect} from "react";

export function JitsuAnalytics({ user }: { user?: IUser }) {
    const { analytics } = useJitsu();
    const router = useRouter();
    useEffect(() => {
        if ( user?.id) {
            analytics.identify(user.id, {
                email: user.email,
                name: user.name,
                tenant: user?.tenant?.name,
                tenantId: user?.tenant?.id,
            });
        }
    }, [user, analytics, router.asPath]);

    useEffect(() => {
        analytics.page(router.asPath, {context:{
            email: user?.email,
                name: user?.name,
                tenant: user?.tenant?.name,
                tenantId: user?.tenant?.id,
        }});
    }, [router.asPath,user, analytics]);
    return <React.Fragment />;
}
