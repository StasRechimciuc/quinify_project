import {getConversations} from "@/actions/message.action";
import {getDbUserById} from "@/actions/user.action";
import {currentUser} from "@clerk/nextjs/server";
import {redirect} from "next/navigation";
import ConversationList from "@/components/messages/ConversationList";

export default async function MessagesPage() {
    const [user, dbUserId] = await Promise.all([currentUser(), getDbUserById()]);
    if (!user) redirect("/");
    if (!dbUserId) redirect("/");

    const conversations = await getConversations();

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Messages</h1>
            <ConversationList conversations={conversations} dbUserId={dbUserId}/>
        </div>
    );
}
