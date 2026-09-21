"use client";

import PusherClient from "pusher-js";

let client: PusherClient | null = null;
const refCounts = new Map<string, number>();

export function getPusherClient() {
    if (!client) {
        client = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            authEndpoint: "/api/pusher/auth",
        });
    }
    return client;
}

// Multiple components can subscribe to the same channel name at once (e.g. the
// navbar's unread badge and the /messages conversation list both listen on
// private-user-{id}). pusher-js hands back the same underlying channel object
// for repeated subscribe() calls, so a plain unsubscribe() from one consumer
// would tear it down for all the others. These wrappers reference-count so the
// channel is only actually released once nothing is using it anymore.
export function subscribeShared(channelName: string) {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(channelName);
    refCounts.set(channelName, (refCounts.get(channelName) ?? 0) + 1);
    return channel;
}

export function unsubscribeShared(channelName: string) {
    const pusher = getPusherClient();
    const remaining = (refCounts.get(channelName) ?? 1) - 1;
    if (remaining <= 0) {
        refCounts.delete(channelName);
        pusher.unsubscribe(channelName);
    } else {
        refCounts.set(channelName, remaining);
    }
}
