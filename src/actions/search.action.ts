"use server"

import {prisma} from "@/lib/prisma";

export const searchUsers = async (query: string) => {
    const q = query.trim();
    if (!q) return [];

    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    {username: {contains: q, mode: "insensitive"}},
                    {name: {contains: q, mode: "insensitive"}},
                ],
            },
            select: {
                id: true,
                name: true,
                username: true,
                image: true,
            },
            take: 6,
        });
        return users;
    } catch (err) {
        console.log("Error searching users: ", err);
        return [];
    }
};
