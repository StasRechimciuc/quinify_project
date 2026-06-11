import {getProfileByUsername, getUserLikedPosts, getUserPosts, isFollowing} from "@/actions/profile.action";
import {notFound} from "next/navigation";
import ProfilePageClient from "@/app/profile/[username]/ProfilePageClient";

export const generateMetadata = async ({params}: { params: { username: string } }) => {
    const user = await getProfileByUsername(params.username);
    if (!user) return;
    return {
        title: `${user?.name ?? "Nonexistent Profile"}`,
        description: user?.bio ?? `Check out ${user?.name}'s page`
    }
}

const ProfilePageServer = async ({params}: { params: { username: string } }) => {
    const user = await getProfileByUsername(params.username);
    if (!user) notFound();

    const [posts, likedPosts, isCurrentUserFollowing] = await Promise.all([
        getUserPosts(user.id),
        getUserLikedPosts(user.id),
        isFollowing(user.id)
    ])

    return (
        <ProfilePageClient
            user={user}
            posts={posts}
            likedPosts={likedPosts}
            isFollowing={isCurrentUserFollowing}
        />
    )
}

export default ProfilePageServer;