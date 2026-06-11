"use server"

import {auth, currentUser} from "@clerk/nextjs/server";
import {prisma} from "@/lib/prisma";
import {revalidatePath} from "next/cache";

export const syncUser = async () => {
    try {
        const {userId} = await auth();
        const user = await currentUser();

        if (!userId || !user) return;

        const existingUser = await prisma.user.findUnique({
            where: {
                clerkId: userId
            }
        })

        if (existingUser) return existingUser;

        const dbUser = await prisma.user.create({
            data: {
                clerkId: userId,
                name: `${user.firstName || ""} ${user.lastName || ""}`,
                username: user.username ?? user.emailAddresses[0].emailAddress.split("@")[0],
                email: user.emailAddresses[0].emailAddress,
                image: user.imageUrl,
            },
        });
    } catch (err) {
        console.log(err)
    }
}

export const getUserByClerkId = async (clerkId: string) => {
    return prisma.user.findUnique({
        where: {
            clerkId
        },
        include: {
            _count: {
                select: {
                    followers: true,
                    following: true,
                    posts: true
                }
            }
        }
    });
}

export const getDbUserById = async () => {
    const {userId: clerkId} = await auth();
    if (!clerkId) return null;

    const user = await getUserByClerkId(clerkId);

    if (!user) throw new Error("User not found.");

    return user.id;
}

export const getRandomUsers = async () => {

    const userId = await getDbUserById();

    if (!userId) return [];
    try {
        const randomUsers = await prisma.user.findMany({
            where: {
                AND: [
                    {
                        NOT: {id: userId}
                    },
                    {
                        NOT: {
                            followers: {
                                some: {
                                    followerId: userId
                                }
                            }
                        }
                    }
                ]
            },
            select: {
                id: true,
                name: true,
                image: true,
                username: true,
                _count: {
                    select: {
                        followers: true
                    }
                }
            },
            take: 3
        })
        return randomUsers;
    } catch (err) {
        console.log("Error getting random users: ", err)
        return [];
    }


}

export const toggleFollow = async (targetUserId: string) => {
    try {
        const userId = await getDbUserById();
        if (!userId) return [];
        const existingFollow = await prisma.follows.findUnique({
            where: {
                followerId_followingId: {
                    followerId: userId,
                    followingId: targetUserId
                }
            }
        })
        if (existingFollow) {
            //     unfollow
            await prisma.follows.delete({
                where: {
                    followerId_followingId: {
                        followerId: userId,
                        followingId: targetUserId
                    }
                }
            })
        } else {
            //     follow
            await prisma.$transaction([
                prisma.follows.create({
                    data: {
                        followerId: userId,
                        followingId: targetUserId
                    }
                }),
                prisma.notification.create({
                    data: {
                        type: "FOLLOW",
                        userId: targetUserId,
                        creatorId: userId
                    }
                })
            ])
        }
        revalidatePath("/")

        return {success: true}
    } catch (err) {
        console.log("Error in following: ", err)
        return {success: false, error: "Error in following"}
    }
}