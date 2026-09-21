"use server"

import {auth, currentUser} from "@clerk/nextjs/server";
import {prisma} from "@/lib/prisma";
import {revalidatePath} from "next/cache";
import {Prisma} from "@prisma/client";
import {pusherServer} from "@/lib/pusher";
import {cache} from "react";

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

        return dbUser;
    } catch (err) {
        console.log(err)
    }
}

// Wrapped in React's per-request cache: Navbar, Sidebar, and most page
// components each independently need "the current DB user," and without
// this every one of them would hit Postgres separately for the exact same
// row on every single navigation — the main cause of multi-second page
// loads against a networked (Neon) database in dev.
export const getUserByClerkId = cache(async (clerkId: string) => {
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
})

export const getDbUserById = cache(async () => {
    const {userId: clerkId} = await auth();
    if (!clerkId) return null;

    // Lightweight on purpose: this runs on nearly every authenticated action
    // in the app and only ever needs the id, so it skips getUserByClerkId's
    // follower/following/post _count aggregate.
    const user = await prisma.user.findUnique({
        where: {clerkId},
        select: {id: true},
    });

    if (!user) throw new Error("User not found.");

    return user.id;
})

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

export const getFollowedUsers = async () => {

    const userId = await getDbUserById();

    if (!userId) return [];
    try {
        const follows = await prisma.follows.findMany({
            where: {
                followerId: userId
            },
            select: {
                following: {
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
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })
        return follows.map((f) => f.following);
    } catch (err) {
        console.log("Error getting followed users: ", err)
        return [];
    }


}

export const toggleFollow = async (targetUserId: string) => {
    try {
        const userId = await getDbUserById();
        if (!userId) return {success: false, error: "Not authenticated"};
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
            let created = true;
            try {
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
            } catch (err) {
                // Two near-simultaneous clicks can both pass the existingFollow
                // check above; treat "already following" as a harmless no-op
                // instead of surfacing it as a failure.
                const alreadyFollowing =
                    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
                if (!alreadyFollowing) throw err;
                created = false;
            }

            if (created) {
                try {
                    await pusherServer.trigger(`private-user-${targetUserId}`, "new-notification", {});
                } catch (err) {
                    console.error("Failed to push follow notification:", err);
                }
            }
        }
        revalidatePath("/")

        return {success: true}
    } catch (err) {
        console.log("Error in following: ", err)
        return {success: false, error: "Error in following"}
    }
}