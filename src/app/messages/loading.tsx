import {Skeleton} from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="max-w-3xl mx-auto">
            <Skeleton className="h-8 w-32 mb-6"/>
            <div className="space-y-1">
                {Array.from({length: 5}, (_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                        <Skeleton className="w-12 h-12 rounded-full shrink-0"/>
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32"/>
                            <Skeleton className="h-3 w-48"/>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
