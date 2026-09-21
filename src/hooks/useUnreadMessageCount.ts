"use client";

import {useEffect, useState} from "react";
import {getTotalUnreadMessageCount} from "@/actions/message.action";
import {subscribeShared, unsubscribeShared} from "@/lib/pusher-client";

export function useUnreadMessageCount(dbUserId: string | null) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!dbUserId) return;

        const refresh = () => {
            getTotalUnreadMessageCount().then(setCount).catch(() => {});
        };

        refresh();

        const channelName = `private-user-${dbUserId}`;
        const channel = subscribeShared(channelName);
        channel.bind("new-message", refresh);

        return () => {
            channel.unbind("new-message", refresh);
            unsubscribeShared(channelName);
        };
    }, [dbUserId]);

    return count;
}
