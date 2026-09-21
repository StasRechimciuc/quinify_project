import {Card, CardContent} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import {PostCardSkeleton} from "@/components/PostCardSkeleton";

export default function Loading() {
    return (
        <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 gap-6">
                <Card className="bg-card">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center">
                            <Skeleton className="w-24 h-24 rounded-full"/>
                            <Skeleton className="mt-4 h-6 w-40"/>
                            <Skeleton className="mt-2 h-4 w-24"/>

                            <div className="w-full mt-6 flex justify-between">
                                <Skeleton className="h-8 w-16"/>
                                <Skeleton className="h-8 w-16"/>
                                <Skeleton className="h-8 w-16"/>
                            </div>

                            <Skeleton className="w-full mt-4 h-9"/>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <PostCardSkeleton/>
                    <PostCardSkeleton/>
                </div>
            </div>
        </div>
    );
}
