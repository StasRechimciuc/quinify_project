import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { pusherServer } from "@/lib/pusher";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

    const dbUser = await prisma.user.findUnique({
        where: { clerkId },
        select: { id: true },
    });
    if (!dbUser) return new NextResponse("Unauthorized", { status: 401 });

    const formData = await req.formData();
    const socketId = formData.get("socket_id") as string;
    const channel = formData.get("channel_name") as string;

    // A user may only subscribe to their own personal channel.
    if (channel === `private-user-${dbUser.id}`) {
        return NextResponse.json(pusherServer.authorizeChannel(socketId, channel));
    }

    // A user may only subscribe to a conversation channel they're a participant of.
    const match = channel.match(/^private-conversation-(.+)$/);
    if (match) {
        const conversationId = match[1];
        const participant = await prisma.conversationParticipant.findUnique({
            where: { conversationId_userId: { conversationId, userId: dbUser.id } },
        });
        if (!participant) return new NextResponse("Forbidden", { status: 403 });

        return NextResponse.json(pusherServer.authorizeChannel(socketId, channel));
    }

    return new NextResponse("Forbidden", { status: 403 });
}
