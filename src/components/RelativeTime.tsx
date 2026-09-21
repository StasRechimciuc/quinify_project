"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

// formatDistanceToNow's output depends on the exact moment it's called, so
// computing it directly during render produces a different string on the
// server (request time) than on the client's first paint (hydration time),
// which React flags as a hydration mismatch. Rendering nothing until after
// mount keeps the server and client's first paint identical; the relative
// string then fills in immediately.
export function RelativeTime({ date, suffix = "" }: { date: Date | string; suffix?: string }) {
    const [text, setText] = useState<string | null>(null);

    useEffect(() => {
        setText(formatDistanceToNow(new Date(date)));
    }, [date]);

    if (text === null) return null;

    return (
        <>
            {text}
            {suffix}
        </>
    );
}
