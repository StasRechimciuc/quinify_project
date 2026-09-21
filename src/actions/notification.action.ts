"use server"

import {prisma} from "@/lib/prisma";
import {getDbUserById} from "@/actions/user.action";

export async function getNotifications() {
    try {
        const userId = await getDbUserById();
        if (!userId) return [];

        const notifications = await prisma.notification.findMany({
            where: {
                userId,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true,
                    },
                },
                post: {
                    select: {
                        id: true,
                        content: true,
                        image: true,
                    },
                },
                comment: {
                    select: {
                        id: true,
                        content: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return notifications;
    } catch (error) {
        console.error("Error fetching notifications:", error);
        throw new Error("Failed to fetch notifications");
    }
}

export async function getUnreadNotificationCount() {
    const userId = await getDbUserById();
    if (!userId) return 0;

    try {
        return await prisma.notification.count({
            where: {userId, read: false},
        });
    } catch (error) {
        console.error("Error counting unread notifications:", error);
        return 0;
    }
}

export async function markNotificationsAsRead(notificationIds: string[]) {
    try {
        const userId = await getDbUserById();
        if (!userId) return { success: false };

        await prisma.notification.updateMany({
            where: {
                id: {
                    in: notificationIds,
                },
                userId,
            },
            data: {
                read: true,
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Error marking notifications as read:", error);
        return { success: false };
    }
}