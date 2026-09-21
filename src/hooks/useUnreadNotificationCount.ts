"use client";

import {useEffect, useState} from "react";
import {getUnreadNotificationCount} from "@/actions/notification.action";
import {subscribeShared, unsubscribeShared} from "@/lib/pusher-client";

export function useUnreadNotificationCount(dbUserId: string | null) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!dbUserId) return;

        const refresh = () => {
            getUnreadNotificationCount().then(setCount).catch(() => {});
        };

        refresh();

        const channelName = `private-user-${dbUserId}`;
        const channel = subscribeShared(channelName);
        channel.bind("new-notification", refresh);

        return () => {
            channel.unbind("new-notification", refresh);
            unsubscribeShared(channelName);
        };
    }, [dbUserId]);

    return count;
}
