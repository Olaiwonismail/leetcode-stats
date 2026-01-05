'use client';

import { useState, useEffect } from 'react';

interface MarkdownDisplayProps {
    path: string;
}

export function MarkdownDisplay({ path }: MarkdownDisplayProps) {
    const [origin, setOrigin] = useState('');

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const fullUrl = origin ? origin + path : path;
    const markdown = `[![LeetCode Stats](${fullUrl})](${fullUrl})`;

    return <code>{markdown}</code>;
}
