"use client";

import {BellIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import Link from "next/link";
import {useUnreadNotificationCount} from "@/hooks/useUnreadNotificationCount";

function UnreadBadge({count}: { count: number }) {
    if (count === 0) return null;
    return (
        <span
            className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
            {count > 9 ? "9+" : count}
        </span>
    );
}

export function NotificationsNavLink({dbUserId, variant = "desktop"}: { dbUserId: string | null; variant?: "desktop" | "mobile" }) {
    const unreadCount = useUnreadNotificationCount(dbUserId);

    if (variant === "mobile") {
        return (
            <Button variant="ghost" className="flex items-center gap-3 justify-start" asChild>
                <Link href="/notifications">
                    <span className="relative">
                        <BellIcon className="w-4 h-4"/>
                        <UnreadBadge count={unreadCount}/>
                    </span>
                    Notifications
                </Link>
            </Button>
        );
    }

    return (
        <Button variant="ghost" className="flex items-center gap-2" asChild>
            <Link href="/notifications">
                <span className="relative">
                    <BellIcon className="w-4 h-4"/>
                    <UnreadBadge count={unreadCount}/>
                </span>
                <span className="hidden lg:inline">Notifications</span>
            </Link>
        </Button>
    );
}
