"use client";

import Link from "next/link";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import {formatDistanceToNowStrict} from "date-fns";
import {useEffect, useState} from "react";
import {getConversations} from "@/actions/message.action";
import {subscribeShared, unsubscribeShared} from "@/lib/pusher-client";

type Conversations = Awaited<ReturnType<typeof getConversations>>;

export default function ConversationList({
                                              conversations: initialConversations,
                                              dbUserId,
                                          }: {
    conversations: Conversations;
    dbUserId: string;
}) {
    const [conversations, setConversations] = useState(initialConversations);

    useEffect(() => {
        const channelName = `private-user-${dbUserId}`;
        const channel = subscribeShared(channelName);
        const refresh = () => {
            getConversations().then(setConversations).catch(() => {});
        };
        channel.bind("new-message", refresh);

        return () => {
            channel.unbind("new-message", refresh);
            unsubscribeShared(channelName);
        };
    }, [dbUserId]);

    if (conversations.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No conversations yet. Visit a profile and hit &quot;Message&quot; to start one.
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {conversations.map((conversation) => (
                <Link
                    key={conversation.id}
                    href={`/messages/${conversation.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                    <Avatar className="w-12 h-12">
                        <AvatarImage src={conversation.otherUser?.image ?? "/avatar.png"}/>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold truncate">
                                {conversation.otherUser?.name ?? conversation.otherUser?.username ?? "Unknown user"}
                            </span>
                            {conversation.lastMessage && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {formatDistanceToNowStrict(new Date(conversation.lastMessage.createdAt), {addSuffix: true})}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage?.content ?? "No messages yet"}
                        </p>
                    </div>
                    {conversation.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground shrink-0">
                            {conversation.unreadCount}
                        </span>
                    )}
                </Link>
            ))}
        </div>
    );
}
