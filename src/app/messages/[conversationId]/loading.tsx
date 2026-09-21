import {Skeleton} from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)]">
            <div className="flex flex-col h-full border rounded-lg bg-card">
                <div className="flex items-center gap-3 border-b p-4">
                    <Skeleton className="w-10 h-10 rounded-full"/>
                    <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32"/>
                        <Skeleton className="h-3 w-20"/>
                    </div>
                </div>

                <div className="flex-1 p-4 space-y-3">
                    <div className="flex justify-start">
                        <Skeleton className="h-10 w-48 rounded-2xl"/>
                    </div>
                    <div className="flex justify-end">
                        <Skeleton className="h-10 w-40 rounded-2xl"/>
                    </div>
                    <div className="flex justify-start">
                        <Skeleton className="h-10 w-56 rounded-2xl"/>
                    </div>
                </div>

                <div className="flex items-center gap-2 border-t p-4">
                    <Skeleton className="h-9 flex-1"/>
                    <Skeleton className="h-9 w-9"/>
                </div>
            </div>
        </div>
    );
}
