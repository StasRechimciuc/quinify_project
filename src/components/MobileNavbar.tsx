"use client";

import {
    HomeIcon,
    LogOutIcon,
    MenuIcon,
    MoonIcon,
    SearchIcon,
    SunIcon,
    UserIcon,
} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger} from "@/components/ui/sheet";
import {useState} from "react";
import {useUser, SignInButton, SignOutButton} from "@clerk/nextjs";
import {useTheme} from "next-themes";
import Link from "next/link";
import {MessagesNavLink} from "@/components/messages/MessagesNavLink";
import {NotificationsNavLink} from "@/components/notifications/NotificationsNavLink";
import SearchBar from "@/components/search/SearchBar";

function MobileNavbar({dbUserId}: { dbUserId: string | null }) {
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const {isSignedIn, user} = useUser();
    const {theme, setTheme} = useTheme();

    return (
        <div className="flex md:hidden items-center space-x-2">
            <Sheet open={showSearch} onOpenChange={setShowSearch}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <SearchIcon className="h-5 w-5"/>
                        <span className="sr-only">Search</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="top">
                    <SheetHeader>
                        <SheetTitle>Search</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                        <SearchBar autoFocus onNavigate={() => setShowSearch(false)}/>
                    </div>
                </SheetContent>
            </Sheet>

            <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="mr-2"
            >
                <SunIcon
                    className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"/>
                <MoonIcon
                    className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"/>
                <span className="sr-only">Toggle theme</span>
            </Button>

            <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MenuIcon className="h-5 w-5"/>
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px]">
                    <SheetHeader>
                        <SheetTitle>Menu</SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col space-y-4 mt-6">
                        <Button variant="ghost" className="flex items-center gap-3 justify-start" asChild>
                            <Link href="/">
                                <HomeIcon className="w-4 h-4"/>
                                Home
                            </Link>
                        </Button>

                        {isSignedIn ? (
                            <>
                                <NotificationsNavLink dbUserId={dbUserId} variant="mobile"/>
                                <MessagesNavLink dbUserId={dbUserId} variant="mobile"/>
                                <Button variant="ghost" className="flex items-center gap-3 justify-start" asChild>
                                    <Link
                                        href={`/profile/${
                                            user?.username ?? user?.emailAddresses[0]?.emailAddress.split("@")[0]
                                        }`}
                                    >
                                        <UserIcon className="w-4 h-4"/>
                                        Profile
                                    </Link>
                                </Button>
                                <SignOutButton>
                                    <Button variant="ghost" className="flex items-center gap-3 justify-start w-full">
                                        <LogOutIcon className="w-4 h-4"/>
                                        Logout
                                    </Button>
                                </SignOutButton>
                            </>
                        ) : (
                            <SignInButton mode="modal">
                                <Button variant="default" className="w-full">
                                    Sign In
                                </Button>
                            </SignInButton>
                        )}
                    </nav>
                </SheetContent>
            </Sheet>
        </div>
    );
}

export default MobileNavbar;