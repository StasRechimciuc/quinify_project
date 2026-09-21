import {getConversation, markConversationAsRead} from "@/actions/message.action";
import {getDbUserById} from "@/actions/user.action";
import {currentUser} from "@clerk/nextjs/server";
import {notFound, redirect} from "next/navigation";
import ChatThread from "@/components/messages/ChatThread";

export default async function ConversationPage({params}: { params: { conversationId: string } }) {
    const [user, dbUserId] = await Promise.all([currentUser(), getDbUserById()]);
    if (!user) redirect("/");
    if (!dbUserId) redirect("/");

    let data;
    try {
        data = await getConversation(params.conversationId);
    } catch {
        notFound();
    }

    await markConversationAsRead(params.conversationId);

    return (
        <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)]">
            <ChatThread
                conversationId={params.conversationId}
                initialMessages={data.messages}
                dbUserId={dbUserId}
                otherUser={data.otherUser}
            />
        </div>
    );
}
