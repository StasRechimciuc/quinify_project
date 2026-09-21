"use client";

import {useEffect, useRef, useState} from "react";
import {sendMessage, getConversation, markConversationAsRead} from "@/actions/message.action";
import {subscribeShared, unsubscribeShared} from "@/lib/pusher-client";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {ScrollArea} from "@/components/ui/scroll-area";
import {SendIcon, Loader2, AlertCircleIcon} from "lucide-react";
import {formatDistanceToNowStrict} from "date-fns";
import Link from "next/link";

type ConversationData = Awaited<ReturnType<typeof getConversation>>;
type Message = ConversationData["messages"][number];
type OtherUser = ConversationData["otherUser"];
type LocalMessage = Message & { status?: "sending" | "failed" };

function makeTempId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return `temp-${crypto.randomUUID()}`;
    }
    return `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ChatThread({
                                        conversationId,
                                        initialMessages,
                                        dbUserId,
                                        otherUser,
                                    }: {
    conversationId: string;
    initialMessages: Message[];
    dbUserId: string;
    otherUser: OtherUser;
}) {
    const [messages, setMessages] = useState<LocalMessage[]>(initialMessages);
    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const channelName = `private-conversation-${conversationId}`;
        const channel = subscribeShared(channelName);
        const handler = (message: Message) => {
            setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
            if (message.senderId !== dbUserId) {
                markConversationAsRead(conversationId).catch(() => {});
            }
        };
        channel.bind("new-message", handler);

        return () => {
            channel.unbind("new-message", handler);
            unsubscribeShared(channelName);
        };
    }, [conversationId, dbUserId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({behavior: "smooth"});
    }, [messages]);

    const dispatchMessage = (content: string) => {
        const tempId = makeTempId();
        const optimisticMessage: LocalMessage = {
            id: tempId,
            conversationId,
            senderId: dbUserId,
            content,
            createdAt: new Date(),
            sender: {id: dbUserId, name: null, username: "", image: null},
            status: "sending",
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        sendMessage(conversationId, content)
            .then((res) => {
                if (res.success && res.message) {
                    const real = res.message;
                    setMessages((prev) =>
                        // The real event may have already arrived via Pusher before this
                        // promise resolved (it's delivered to the sender's own subscription
                        // too) — in that case just drop the temp bubble instead of duplicating.
                        prev.some((m) => m.id === real.id)
                            ? prev.filter((m) => m.id !== tempId)
                            : prev.map((m) => (m.id === tempId ? real : m))
                    );
                } else {
                    setMessages((prev) => prev.map((m) => (m.id === tempId ? {...m, status: "failed"} : m)));
                }
            })
            .catch(() => {
                setMessages((prev) => prev.map((m) => (m.id === tempId ? {...m, status: "failed"} : m)));
            });
    };

    const handleSend = () => {
        const content = input.trim();
        if (!content) return;
        setInput("");
        dispatchMessage(content);
    };

    const retryMessage = (message: LocalMessage) => {
        setMessages((prev) => prev.filter((m) => m.id !== message.id));
        dispatchMessage(message.content);
    };

    return (
        <div className="flex flex-col h-full border rounded-lg bg-card">
            <div className="flex items-center gap-3 border-b p-4">
                <Avatar className="w-10 h-10">
                    <AvatarImage src={otherUser?.image ?? "/avatar.png"}/>
                </Avatar>
                <div>
                    <Link href={`/profile/${otherUser?.username}`} className="font-semibold hover:underline">
                        {otherUser?.name ?? otherUser?.username ?? "Unknown user"}
                    </Link>
                    <p className="text-sm text-muted-foreground">@{otherUser?.username}</p>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                    {messages.map((message) => {
                        const isOwn = message.senderId === dbUserId;
                        const isSending = message.status === "sending";
                        const isFailed = message.status === "failed";
                        return (
                            <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                                <div
                                    role={isFailed ? "button" : undefined}
                                    onClick={isFailed ? () => retryMessage(message) : undefined}
                                    className={`max-w-[70%] rounded-2xl px-4 py-2 transition-opacity ${
                                        isFailed
                                            ? "bg-destructive/10 border border-destructive/40 cursor-pointer"
                                            : isOwn
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                    } ${isSending ? "opacity-60" : ""}`}
                                >
                                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                    {isFailed ? (
                                        <p className="text-[10px] mt-1 flex items-center gap-1 text-destructive">
                                            <AlertCircleIcon className="w-3 h-3"/>
                                            Failed to send · tap to retry
                                        </p>
                                    ) : isSending ? (
                                        <p
                                            className={`text-[10px] mt-1 flex items-center gap-1 ${
                                                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                                            }`}
                                        >
                                            <Loader2 className="w-3 h-3 animate-spin"/>
                                            Sending...
                                        </p>
                                    ) : (
                                        <p
                                            className={`text-[10px] mt-1 ${
                                                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                                            }`}
                                        >
                                            {formatDistanceToNowStrict(new Date(message.createdAt), {addSuffix: true})}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={bottomRef}/>
                </div>
            </ScrollArea>

            <div className="flex items-center gap-2 border-t p-4">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Type a message..."
                />
                <Button onClick={handleSend} disabled={!input.trim()} size="icon">
                    <SendIcon className="w-4 h-4"/>
                </Button>
            </div>
        </div>
    );
}
