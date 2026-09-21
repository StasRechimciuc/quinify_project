"use server"

import {getDbUserById} from "@/actions/user.action";
import {prisma} from "@/lib/prisma";
import {revalidatePath, revalidateTag, unstable_cache} from "next/cache";
import {Prisma} from "@prisma/client";
import {pusherServer} from "@/lib/pusher";

export const createPost = async (content: string, image: string) => {
    const userId = await getDbUserById();
    if (!userId) return;
    try {
        const post = await prisma.post.create({
            data: {
                content,
                image,
                authorId: userId
            }
        })

        revalidatePath("/");
        revalidateTag("posts");
        return {success: true, post}
    } catch (err) {
        return {success: false, error: "Failed to create post"}
    }
}

// Cached in Next's Data Cache (not just per-request) since the feed is read
// far more often than it's written to — repeat visits to "/" within the
// cache window skip the round trip to Postgres entirely. Every mutation that
// can change what this returns (create/like/comment/delete) calls
// revalidateTag("posts") right after its write so the cache never serves
// data older than the mutation that invalidated it.
export const getPosts = unstable_cache(
    async () => {
        try {
            const posts = await prisma.post.findMany({
                orderBy: {
                    createdAt: "desc"
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                            username: true
                        }
                    },
                    comments: {
                        include: {
                            author: {
                                select: {
                                    id: true,
                                    username: true,
                                    image: true,
                                    name: true
                                }
                            }
                        },
                        orderBy: {
                            createdAt: "asc"
                        }
                    },
                    likes: {
                        select: {
                            userId: true,


                        }
                    },
                    _count: {
                        select: {
                            likes: true,
                            comments: true
                        }
                    }
                },
            })
            return posts;
        } catch (err) {
            console.log("Error getting posts");
            return [];
        }
    },
    ["posts"],
    {tags: ["posts"], revalidate: 60}
);

export async function toggleLike(postId: string) {
    try {
        const userId = await getDbUserById();
        if (!userId) return;

        // check if like exists
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_postId: {
                    userId,
                    postId,
                },
            },
        });

        const post = await prisma.post.findUnique({
            where: {id: postId},
            select: {authorId: true},
        });

        if (!post) throw new Error("Post not found");

        if (existingLike) {
            // unlike
            await prisma.like.delete({
                where: {
                    userId_postId: {
                        userId,
                        postId,
                    },
                },
            });
        } else {
            // like and create notification (only if liking someone else's post)
            let created = true;
            try {
                await prisma.$transaction([
                    prisma.like.create({
                        data: {
                            userId,
                            postId,
                        },
                    }),
                    ...(post.authorId !== userId
                        ? [
                            prisma.notification.create({
                                data: {
                                    type: "LIKE",
                                    userId: post.authorId, // recipient (post author)
                                    creatorId: userId, // person who liked
                                    postId,
                                },
                            }),
                        ]
                        : []),
                ]);
            } catch (err) {
                // Two near-simultaneous clicks can both pass the existingLike
                // check above; treat "already liked" as a harmless no-op
                // instead of surfacing it as a failure.
                const alreadyLiked =
                    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
                if (!alreadyLiked) throw err;
                created = false;
            }

            if (created && post.authorId !== userId) {
                try {
                    await pusherServer.trigger(`private-user-${post.authorId}`, "new-notification", {});
                } catch (err) {
                    console.error("Failed to push like notification:", err);
                }
            }
        }

        revalidatePath("/");
        revalidateTag("posts");
        return {success: true};
    } catch (error) {
        console.error("Failed to toggle like:", error);
        return {success: false, error: "Failed to toggle like"};
    }
}

export const createComment = async (postId: string, content: string) => {
    const userId = await getDbUserById()
    if (!userId) return;
    if (!content) throw new Error("Content is required.");

    try {


        const post = await prisma.post.findUnique({
            where: {
                id: postId
            }, select: {
                authorId: true
            }
        })

        if (!post) throw new Error("Post not found");

        const [comment] = await prisma.$transaction(
            async (tx) => {
                const newComment = await tx.comment.create({
                    data: {
                        content,
                        postId,
                        authorId: userId,
                    }
                })

                if (post.authorId !== userId) {
                    await tx.notification.create({
                        data: {
                            userId: post.authorId,
                            type: "COMMENT",
                            creatorId: userId,
                            postId,
                            commentId: newComment.id
                        }
                    })
                }

                return [newComment]
            })

        if (post.authorId !== userId) {
            try {
                await pusherServer.trigger(`private-user-${post.authorId}`, "new-notification", {});
            } catch (err) {
                console.error("Failed to push comment notification:", err);
            }
        }

        revalidatePath("/");
        revalidateTag("posts");
        return {success: true, comment}
    } catch (err) {
        return {success: false, error: "Failed to create comment"};
    }
}

export const deletePost = async (postId: string) => {
    const userId = await getDbUserById();

    try {
        const post = await prisma.post.findUnique({
            where: {id: postId},
            select: {authorId: true}
        })

        if (!post) return;
        if(post.authorId !== userId) throw new Error("Unauthorized - Not the author of the post")
        await prisma.post.delete({
            where: {id: postId}
        })

        revalidatePath("/");
        revalidateTag("posts");
        return {success: true}
    } catch (err) {
        console.log(err)
        return {success: false, error: "Failed to delete the post"}
    }
}
