"use server"

import {getDbUserById} from "@/actions/user.action";
import {prisma} from "@/lib/prisma";
import {revalidatePath} from "next/cache";

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
        return {success: true, post}
    } catch (err) {
        return {success: false, error: "Failed to create post"}
    }
}

export const getPosts = async () => {
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
}

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
        }

        revalidatePath("/");
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
                const newComment = await prisma.comment.create({
                    data: {
                        content,
                        postId,
                        authorId: post.authorId,
                    }
                })

                const notification = await prisma.notification.create({
                    data: {
                        userId,
                        type: "COMMENT",
                        creatorId: userId,
                        postId,
                        commentId: newComment.id
                    }
                })

                return [newComment]
            })


        revalidatePath("/");
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
        return {success: true}
    } catch (err) {
        console.log(err)
        return {success: false, error: "Failed to delete the post"}
    }
}
