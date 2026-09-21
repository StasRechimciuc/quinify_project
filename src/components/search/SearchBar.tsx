"use client";

import {useEffect, useRef, useState} from "react";
import Link from "next/link";
import {SearchIcon} from "lucide-react";
import {searchUsers} from "@/actions/search.action";
import {Input} from "@/components/ui/input";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import {Skeleton} from "@/components/ui/skeleton";

type SearchResult = Awaited<ReturnType<typeof searchUsers>>[number];

export default function SearchBar({
                                       onNavigate,
                                       autoFocus,
                                       className,
                                   }: {
    onNavigate?: () => void;
    autoFocus?: boolean;
    className?: string;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    // Guards against a slower earlier request resolving after a faster later
    // one and overwriting it with stale results (only the response matching
    // the most recently fired request is ever applied).
    const requestIdRef = useRef(0);

    useEffect(() => {
        const trimmed = query.trim();
        if (!trimmed) {
            requestIdRef.current += 1;
            setResults([]);
            setIsLoading(false);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        const timeout = setTimeout(() => {
            const thisRequestId = ++requestIdRef.current;
            searchUsers(trimmed)
                .then((users) => {
                    if (thisRequestId !== requestIdRef.current) return;
                    setResults(users);
                    setIsOpen(true);
                })
                .finally(() => {
                    if (thisRequestId === requestIdRef.current) setIsLoading(false);
                });
        }, 300);

        return () => clearTimeout(timeout);
    }, [query]);

    useEffect(() => {
        const handleClickAway = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickAway);
        return () => document.removeEventListener("mousedown", handleClickAway);
    }, []);

    const handleSelect = () => {
        setQuery("");
        setResults([]);
        setIsOpen(false);
        onNavigate?.();
    };

    return (
        <div ref={containerRef} className={`relative ${className ?? ""}`}>
            <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.trim() && setIsOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            setIsOpen(false);
                            (e.target as HTMLInputElement).blur();
                        }
                    }}
                    placeholder="Search people..."
                    autoFocus={autoFocus}
                    className="pl-8"
                />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full rounded-md border bg-popover shadow-md z-50 overflow-hidden">
                    {isLoading ? (
                        <div className="p-2 space-y-2">
                            <Skeleton className="h-10 w-full"/>
                            <Skeleton className="h-10 w-full"/>
                        </div>
                    ) : results.length > 0 ? (
                        <ul className="max-h-80 overflow-y-auto py-1">
                            {results.map((user) => (
                                <li key={user.id}>
                                    <Link
                                        href={`/profile/${user.username}`}
                                        onClick={handleSelect}
                                        className="flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors"
                                    >
                                        <Avatar className="size-8">
                                            <AvatarImage src={user.image ?? "/avatar.png"}/>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{user.name ?? user.username}</p>
                                            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="px-3 py-4 text-sm text-muted-foreground text-center">No users found</p>
                    )}
                </div>
            )}
        </div>
    );
}
