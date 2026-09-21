import {Card, CardContent} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";

export function PostCardSkeleton() {
    return (
        <Card>
            <CardContent className="p-4 sm:p-6">
                <div className="flex gap-3 sm:gap-4">
                    <Skeleton className="size-8 sm:size-10 rounded-full shrink-0"/>
                    <div className="flex-1 space-y-3">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-40"/>
                            <Skeleton className="h-3 w-24"/>
                        </div>
                        <Skeleton className="h-4 w-full"/>
                        <Skeleton className="h-4 w-2/3"/>
                        <div className="flex gap-4 pt-2">
                            <Skeleton className="h-4 w-10"/>
                            <Skeleton className="h-4 w-10"/>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
