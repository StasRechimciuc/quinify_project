import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import {PostCardSkeleton} from "@/components/PostCardSkeleton";

export default function Loading() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            <div className="lg:col-span-6 space-y-6">
                <Card>
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex gap-4">
                            <Skeleton className="size-10 rounded-full shrink-0"/>
                            <Skeleton className="h-20 flex-1"/>
                        </div>
                        <div className="flex items-center justify-between border-t pt-4">
                            <Skeleton className="h-8 w-20"/>
                            <Skeleton className="h-8 w-20"/>
                        </div>
                    </CardContent>
                </Card>

                {Array.from({length: 3}, (_, i) => (
                    <PostCardSkeleton key={i}/>
                ))}
            </div>

            <div className="hidden lg:col-span-4 lg:block">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-28"/>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Array.from({length: 3}, (_, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <Skeleton className="size-10 rounded-full shrink-0"/>
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-3 w-24"/>
                                    <Skeleton className="h-3 w-16"/>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
