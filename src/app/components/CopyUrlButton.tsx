'use client';

import { useState } from 'react';

interface CopyUrlButtonProps {
    path: string;
}

export function CopyUrlButton({ path }: CopyUrlButtonProps) {
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [copiedMd, setCopiedMd] = useState(false);

    const handleCopyUrl = async () => {
        try {
            const fullUrl = window.location.origin + path;
            await navigator.clipboard.writeText(fullUrl);
            setCopiedUrl(true);
            setTimeout(() => setCopiedUrl(false), 2000);
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    };

    const handleCopyMarkdown = async () => {
        try {
            const fullUrl = window.location.origin + path;
            const markdown = `[![LeetCode Stats](${fullUrl})](${fullUrl})`;
            await navigator.clipboard.writeText(markdown);
            setCopiedMd(true);
            setTimeout(() => setCopiedMd(false), 2000);
        } catch (err) {
            console.error('Failed to copy Markdown:', err);
        }
    };

    return (
        <div className="copy-buttons-container">
            <button
                onClick={handleCopyUrl}
                className="copy-button"
                aria-label="Copy URL to clipboard"
            >
                {copiedUrl ? (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Copied!
                    </>
                ) : (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy URL
                    </>
                )}
            </button>

            <button
                onClick={handleCopyMarkdown}
                className="copy-button"
                aria-label="Copy Markdown to clipboard"
                title="Copy as Markdown for GitHub Profile"
            >
                {copiedMd ? (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Copied MD!
                    </>
                ) : (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                        </svg>
                        Copy Markdown
                    </>
                )}
            </button>

            <style jsx>{`
                .copy-buttons-container {
                    display: flex;
                    gap: 10px;
                }
                /* Inherit styles from global or parent, but ensure flex layout works */
            `}</style>
        </div>
    );
}
