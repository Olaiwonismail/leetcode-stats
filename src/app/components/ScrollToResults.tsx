'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface ScrollToResultsProps {
    targetId: string;
}

export function ScrollToResults({ targetId }: ScrollToResultsProps) {
    const searchParams = useSearchParams();

    useEffect(() => {
        // Check if we have a username, implying a search was performed
        if (searchParams.get('username')) {
            const element = document.getElementById(targetId);
            if (element) {
                // Small timeout to ensure DOM is ready and layout is stable
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }
    }, [searchParams, targetId]);

    return null;
}
