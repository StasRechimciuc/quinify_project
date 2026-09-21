import Link from "next/link";
import DesktopNavbar from "@/components/DesktopNavbar";
import MobileNavbar from "@/components/MobileNavbar";
import {currentUser} from "@clerk/nextjs/server";
import {syncUser} from "@/actions/user.action"

async function Navbar() {

    const user = await currentUser()
    let dbUserId: string | null = null;
    if (user) {
        const dbUser = await syncUser()
        dbUserId = dbUser?.id ?? null
    }

    return (
        <nav
            className="sticky top-0 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/" className="text-xl font-bold text-primary font-mono tracking-wider">
                            Quinify
                        </Link>
                    </div>

                    <DesktopNavbar dbUserId={dbUserId}/>
                    <MobileNavbar dbUserId={dbUserId}/>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;