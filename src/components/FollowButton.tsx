"use client"

import {useState} from "react";
import {Button} from "@/components/ui/button";
import {CheckIcon, Loader2Icon} from "lucide-react";
import toast from "react-hot-toast";
import {toggleFollow} from "@/actions/user.action";

// This button only ever renders for users the current user does NOT already
// follow (see getRandomUsers, which excludes existing follows) — so it's a
// one-way "Follow" action here, not a toggle. Once it succeeds we lock it in
// the followed state instead of leaving it clickable, because toggleFollow is
// a true toggle server-side: a second click would silently unfollow the user
// while the button still just said "Follow".
const FollowButton = ({ userId }: { userId: string }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isFollowed, setIsFollowed] = useState(false);

    const handleFollow = async () => {
        if (isFollowed) return;
        setIsLoading(true)

        try {
            const res = await toggleFollow(userId)
            if (res?.success) {
                setIsFollowed(true)
                toast.success("User followed successfully")
            } else {
                toast.error(res?.error ?? "Failed to follow user")
            }
        } catch (err) {
            toast.error("Failed to follow user");
            console.log(err);
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            size="sm"
            variant={isFollowed ? "outline" : "secondary"}
            onClick={handleFollow}
            disabled={isLoading || isFollowed}
            className={"w-20"}
        >
            {isLoading ? (
                <Loader2Icon className={"size-4 animate-spin"}/>
            ) : isFollowed ? (
                <CheckIcon className={"size-4"}/>
            ) : (
                "Follow"
            )}
        </Button>
    )
}

export default FollowButton;