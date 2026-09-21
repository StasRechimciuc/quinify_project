"use server"

import {getDbUserById} from "@/actions/user.action";
import {prisma} from "@/lib/prisma";
import {pusherServer} from "@/lib/pusher";

export async function getOrCreateConversation(otherUserId: string) {
    const userId = await getDbUserById();
    if (!userId) throw new Error("Not authenticated");
    if (userId === otherUserId) throw new Error("Cannot message yourself");

    const existing = await prisma.conversation.findFirst({
        where: {
            AND: [
                {participants: {some: {userId}}},
                {participants: {some: {userId: otherUserId}}},
            ],
        },
        select: {id: true, participants: {select: {userId: true}}},
    });

    if (existing && existing.participants.length === 2) {
        return existing.id;
    }

    const conversation = await prisma.conversation.create({
        data: {
            participants: {
                create: [{userId}, {userId: otherUserId}],
            },
        },
    });

    return conversation.id;
}

export async function getConversations() {
    const userId = await getDbUserById();
    if (!userId) return [];

    // Fetching the conversation list and computing every conversation's unread
    // count are independent of each other, so run them concurrently. The
    // unread counts are computed in a single grouped query instead of one
    // `count()` per conversation (each conversation has its own lastReadAt
    // cutoff, which a plain Prisma groupBy can't express, hence the raw SQL).
    const [rows, unreadRows] = await Promise.all([
        prisma.conversationParticipant.findMany({
            where: {userId},
            select: {
                conversation: {
                    select: {
                        id: true,
                        participants: {
                            where: {userId: {not: userId}},
                            select: {
                                user: {
                                    select: {id: true, name: true, username: true, image: true},
                                },
                            },
                        },
                        messages: {
                            orderBy: {createdAt: "desc"},
                            take: 1,
                            select: {content: true, createdAt: true, senderId: true},
                        },
                    },
                },
            },
            orderBy: {conversation: {updatedAt: "desc"}},
        }),
        prisma.$queryRaw<{conversationId: string; unreadCount: bigint}[]>`
            SELECT cp."conversationId" AS "conversationId", COUNT(m.id) AS "unreadCount"
            FROM "ConversationParticipant" cp
            JOIN "Message" m
              ON m."conversationId" = cp."conversationId"
             AND m."senderId" != cp."userId"
             AND m."createdAt" > cp."lastReadAt"
            WHERE cp."userId" = ${userId}
            GROUP BY cp."conversationId"
        `,
    ]);

    const unreadByConversation = new Map(unreadRows.map((r) => [r.conversationId, Number(r.unreadCount)]));

    return rows.map((row) => ({
        id: row.conversation.id,
        otherUser: row.conversation.participants[0]?.user ?? null,
        lastMessage: row.conversation.messages[0] ?? null,
        unreadCount: unreadByConversation.get(row.conversation.id) ?? 0,
    }));
}

export async function getConversation(conversationId: string) {
    const userId = await getDbUserById();
    if (!userId) throw new Error("Not authenticated");

    const participant = await prisma.conversationParticipant.findUnique({
        where: {conversationId_userId: {conversationId, userId}},
    });
    if (!participant) throw new Error("Not a participant of this conversation");

    const [otherParticipant, messages] = await Promise.all([
        prisma.conversationParticipant.findFirst({
            where: {conversationId, userId: {not: userId}},
            select: {
                user: {select: {id: true, name: true, username: true, image: true}},
            },
        }),
        prisma.message.findMany({
            where: {conversationId},
            orderBy: {createdAt: "asc"},
            include: {
                sender: {select: {id: true, name: true, username: true, image: true}},
            },
        }),
    ]);

    return {otherUser: otherParticipant?.user ?? null, messages};
}

export async function sendMessage(conversationId: string, content: string) {
    try {
        const userId = await getDbUserById();
        if (!userId) return {success: false, error: "Not authenticated"};

        const trimmed = content.trim();
        if (!trimmed) return {success: false, error: "Message cannot be empty"};

        // A fast point lookup on the (conversationId, userId) unique index —
        // this must complete and be verified before anything is written.
        const participant = await prisma.conversationParticipant.findUnique({
            where: {conversationId_userId: {conversationId, userId}},
            select: {conversationId: true},
        });
        if (!participant) {
            return {success: false, error: "Not a participant of this conversation"};
        }

        // The message write, the conversation's "last activity" bump, and
        // fetching the participant list to broadcast to are all independent
        // of each other once authorization is confirmed, so run them in
        // parallel instead of one after another inside a transaction. This is
        // a deliberate trade of strict cross-table atomicity (if the
        // updatedAt bump fails, the conversation just doesn't jump to the top
        // of the list — no message data is lost) for materially lower send
        // latency, since Neon's pooled connection makes every extra
        // sequential round trip noticeably slow.
        const [message, , participants] = await Promise.all([
            prisma.message.create({
                data: {conversationId, senderId: userId, content: trimmed},
                include: {
                    sender: {select: {id: true, name: true, username: true, image: true}},
                },
            }),
            prisma.conversation.update({
                where: {id: conversationId},
                data: {updatedAt: new Date()},
            }),
            prisma.conversationParticipant.findMany({
                where: {conversationId},
                select: {userId: true},
            }),
        ]);

        await Promise.all([
            pusherServer.trigger(`private-conversation-${conversationId}`, "new-message", message),
            ...participants.map((p) =>
                pusherServer.trigger(`private-user-${p.userId}`, "new-message", {
                    conversationId,
                })
            ),
        ]);

        return {success: true, message};
    } catch (err) {
        console.error("Failed to send message:", err);
        return {success: false, error: "Failed to send message"};
    }
}

export async function markConversationAsRead(conversationId: string) {
    try {
        const userId = await getDbUserById();
        if (!userId) return {success: false};

        await prisma.conversationParticipant.update({
            where: {conversationId_userId: {conversationId, userId}},
            data: {lastReadAt: new Date()},
        });

        return {success: true};
    } catch (err) {
        console.error("Failed to mark conversation as read:", err);
        return {success: false};
    }
}

export async function getTotalUnreadMessageCount() {
    const userId = await getDbUserById();
    if (!userId) return 0;

    const result = await prisma.$queryRaw<{totalUnread: bigint}[]>`
        SELECT COUNT(m.id) AS "totalUnread"
        FROM "ConversationParticipant" cp
        JOIN "Message" m
          ON m."conversationId" = cp."conversationId"
         AND m."senderId" != cp."userId"
         AND m."createdAt" > cp."lastReadAt"
        WHERE cp."userId" = ${userId}
    `;

    return Number(result[0]?.totalUnread ?? 0);
}
