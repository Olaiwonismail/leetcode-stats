import { NextRequest, NextResponse } from 'next/server';
import { queries, LEETCODE_API_URL, QueryKey } from '../../lib/leetcode-queries';

// Fetch all LeetCode data for the card
async function fetchAllData(username: string) {
    const results: Record<string, unknown> = {};
    const queryKeys: QueryKey[] = ['problems', 'activity', 'skills', 'profile', 'submissions'];

    for (const queryKey of queryKeys) {
        const query = queries[queryKey];
        try {
            const response = await fetch(LEETCODE_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Referer': 'https://leetcode.com',
                },
                body: JSON.stringify({
                    query,
                    variables: {
                        username,
                        ...(queryKey === 'activity' ? { year: new Date().getFullYear() } : {}),
                        ...(queryKey === 'submissions' ? { limit: 5 } : {})
                    },
                }),
                next: { revalidate: 300 },
            });
            const data = await response.json();
            results[queryKey] = data.data;
        } catch {
            results[queryKey] = null;
        }
    }
    return results;
}

// Generate heatmap squares from submission calendar - compact version
function generateHeatmap(submissionCalendar: string | null, startX: number, startY: number): string {
    const weeks = 12; // Reduced from 20 to fit better

    if (!submissionCalendar) {
        // Generate empty heatmap
        let empty = '';
        for (let week = 0; week < weeks; week++) {
            for (let day = 0; day < 7; day++) {
                const x = startX + week * 12;
                const y = startY + day * 12;
                empty += `<rect x="${x}" y="${y}" width="9" height="9" rx="2" fill="#1a1a2e"/>`;
            }
        }
        return empty;
    }

    const calendar = JSON.parse(submissionCalendar);
    const now = new Date();
    const squares: string[] = [];

    // Generate last 12 weeks (84 days)
    for (let week = weeks - 1; week >= 0; week--) {
        for (let day = 0; day < 7; day++) {
            const date = new Date(now);
            date.setDate(date.getDate() - (week * 7 + (6 - day)));
            const timestamp = Math.floor(date.getTime() / 1000).toString();
            const dayTimestamp = Math.floor(new Date(date.toDateString()).getTime() / 1000).toString();

            const count = calendar[timestamp] || calendar[dayTimestamp] || 0;

            let color = '#1a1a2e'; // empty
            if (count > 0 && count <= 2) color = '#0e4429';
            else if (count > 2 && count <= 5) color = '#006d32';
            else if (count > 5 && count <= 10) color = '#26a641';
            else if (count > 10) color = '#39d353';

            const x = startX + (weeks - 1 - week) * 12;
            const y = startY + day * 12;
            squares.push(`<rect x="${x}" y="${y}" width="9" height="9" rx="2" fill="${color}"/>`);
        }
    }
    return squares.join('');
}

// Generate the SVG card - dynamic sections
function generateSVG(username: string, data: Record<string, unknown>, options: {
    showDifficulty: boolean;
    showActivity: boolean;
    showStats: boolean;
    showBadges: boolean;
    showSubmissions: boolean;
    showBeats: boolean;
    showRank: boolean;
}): string {
    const { showDifficulty, showActivity, showStats, showBadges, showSubmissions, showBeats, showRank } = options;

    // Extract data safely
    const problems = data.problems as {
        allQuestionsCount?: { difficulty: string; count: number }[];
        matchedUser?: {
            submitStatsGlobal?: { acSubmissionNum?: { difficulty: string; count: number }[] };
            problemsSolvedBeatsStats?: { difficulty: string; percentage: number | null }[];
        }
    } | null;

    const activity = data.activity as { matchedUser?: { userCalendar?: { streak?: number; totalActiveDays?: number; submissionCalendar?: string; dccBadges?: { badge: { name: string } }[] } } } | null;
    const skills = data.skills as { matchedUser?: { tagProblemCounts?: { fundamental?: { tagName: string; problemsSolved: number }[]; intermediate?: { tagName: string; problemsSolved: number }[]; advanced?: { tagName: string; problemsSolved: number }[] } } } | null;
    const profile = data.profile as { matchedUser?: { profile?: { realName?: string; ranking?: number } } } | null;
    const submissions = data.submissions as { recentAcSubmissionList?: { title: string; timestamp: string }[] } | null;

    // Problem stats
    const allQuestions = problems?.allQuestionsCount || [];
    const acSubmissions = problems?.matchedUser?.submitStatsGlobal?.acSubmissionNum || [];
    const beatsStats = problems?.matchedUser?.problemsSolvedBeatsStats || [];

    const totalEasy = allQuestions.find(q => q.difficulty === 'Easy')?.count || 0;
    const totalMedium = allQuestions.find(q => q.difficulty === 'Medium')?.count || 0;
    const totalHard = allQuestions.find(q => q.difficulty === 'Hard')?.count || 0;

    const solvedEasy = acSubmissions.find(s => s.difficulty === 'Easy')?.count || 0;
    const solvedMedium = acSubmissions.find(s => s.difficulty === 'Medium')?.count || 0;
    const solvedHard = acSubmissions.find(s => s.difficulty === 'Hard')?.count || 0;
    const totalSolved = solvedEasy + solvedMedium + solvedHard;

    const beatsEasy = beatsStats.find(s => s.difficulty === 'Easy')?.percentage ?? 0;
    const beatsMedium = beatsStats.find(s => s.difficulty === 'Medium')?.percentage ?? 0;
    const beatsHard = beatsStats.find(s => s.difficulty === 'Hard')?.percentage ?? 0;

    // Top 5 skill tags
    const allTags = skills ? [
        ...(skills?.matchedUser?.tagProblemCounts?.fundamental || []),
        ...(skills?.matchedUser?.tagProblemCounts?.intermediate || []),
        ...(skills?.matchedUser?.tagProblemCounts?.advanced || []),
    ].sort((a, b) => b.problemsSolved - a.problemsSolved).slice(0, 5) : [];

    // Activity stats
    const streak = activity?.matchedUser?.userCalendar?.streak || 0;
    const totalActiveDays = activity?.matchedUser?.userCalendar?.totalActiveDays || 0;
    const submissionCalendar = activity?.matchedUser?.userCalendar?.submissionCalendar || null;

    // Monthly challenge badges
    const dccBadges = activity?.matchedUser?.userCalendar?.dccBadges || [];
    const recentBadges = dccBadges.slice(-5).reverse();

    // Recent Submissions
    const recentSubs = submissions?.recentAcSubmissionList?.slice(0, 5) || [];

    // Profile info
    const realName = profile?.matchedUser?.profile?.realName || '';
    const ranking = profile?.matchedUser?.profile?.ranking || 0;

    // Layout Calculations
    let currentY = 88;
    const headerHeight = 88;
    const row1Height = 80;
    const rowGap = 20;

    // Row 1: Difficulty & Activity (+ Beats if enabled)
    const showRow1 = showDifficulty || showActivity;
    let row1Y = currentY;
    if (showRow1) {
        // Increase height if Beats is enabled AND Difficulty is shown
        const effectiveRow1Height = (showDifficulty && showBeats) ? row1Height + 25 : row1Height;
        currentY += effectiveRow1Height + rowGap;
    }

    // Row 2: Skills
    const showRow2 = showStats;
    let row2Y = currentY;
    if (showRow2) {
        currentY += 60 + rowGap;
    }

    // Row 3: Badges
    const showRow3 = showBadges;
    let row3Y = currentY;
    if (showRow3) {
        currentY += 60 + rowGap;
    }

    // Row 4: Recent Submissions
    const showRow4 = showSubmissions;
    let row4Y = currentY;
    if (showRow4) {
        currentY += (recentSubs.length * 20) + 35 + rowGap; // title + list items
    }

    const cardHeight = Math.max(150, currentY);

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${cardHeight}" viewBox="0 0 800 ${cardHeight}">
    <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0d1117"/>
            <stop offset="50%" style="stop-color:#161b22"/>
            <stop offset="100%" style="stop-color:#0d1117"/>
        </linearGradient>
        <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#ffa11615"/>
            <stop offset="100%" style="stop-color:#ffa11605"/>
        </linearGradient>
        <linearGradient id="accentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#ffa116"/>
            <stop offset="100%" style="stop-color:#ff8c00"/>
        </linearGradient>
        <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
        <clipPath id="roundedCard">
            <rect width="800" height="${cardHeight}" rx="16"/>
        </clipPath>
    </defs>
    
    <!-- Background -->
    <rect width="800" height="${cardHeight}" fill="url(#bgGradient)" clip-path="url(#roundedCard)"/>
    
    <!-- Border -->
    <rect x="1" y="1" width="798" height="${cardHeight - 2}" rx="15" fill="none" stroke="#30363d" stroke-width="1"/>
    
    <!-- Header Section -->
    <rect x="0" y="0" width="800" height="70" fill="url(#headerGradient)" clip-path="url(#roundedCard)"/>
    <line x1="0" y1="70" x2="800" y2="70" stroke="#30363d" stroke-width="1"/>
    
    <!-- LeetCode Logo -->
    <g transform="translate(24, 20)">
        <path d="M13.483 11.954l-1.798 1.738c-.31.31-.74.44-1.215.44s-.905-.13-1.215-.44l-2.888-2.908c-.31-.31-.468-.766-.468-1.242s.157-.905.468-1.216l2.88-2.92c.31-.31.75-.43 1.224-.43s.905.13 1.215.44l1.798 1.738c.343.343.91.33 1.267-.025.357-.358.369-.925.026-1.267l-1.74-1.757a3.37 3.37 0 0 0-1.63-.892l1.645-1.668c.344-.343.332-.91-.025-1.267-.357-.357-.924-.368-1.267-.025l-6.733 6.733c-.654.655-.996 1.558-.996 2.557 0 .999.342 1.93.996 2.583l2.898 2.907c.654.653 1.558.968 2.556.968s1.902-.341 2.556-.996l1.74-1.758c.342-.343.33-.91-.026-1.267s-.924-.369-1.267-.026zM13.874 8.673H7.11c-.468 0-.847.403-.847.898s.379.897.847.897h6.764c.468 0 .847-.402.847-.897s-.379-.898-.847-.898z" fill="#FFA116" transform="scale(1.8)"/>
    </g>
    
    <!-- Username & Name -->
    <text x="80" y="${realName && realName !== username ? '32' : '40'}" font-family="'Segoe UI', Arial, sans-serif" font-size="20" font-weight="700" fill="#ffffff">${username}</text>
    ${realName && realName !== username ? `<text x="80" y="52" font-family="'Segoe UI', sans-serif" font-size="12" fill="#8b949e">${realName}</text>` : ''}
    
    <!-- Global Ranking (if enabled) -->
    ${(showRank && ranking > 0) ? `
    <g transform="translate(450, 24)">
        <text x="0" y="0" font-family="'Segoe UI', sans-serif" font-size="11" fill="#8b949e">GLOBAL RANKING</text>
        <text x="0" y="20" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="600" fill="#ffffff">#${ranking.toLocaleString()}</text>
    </g>` : ''}

    <!-- Total Solved Badge (right side of header) -->
    <g transform="translate(620, 12)">
        <rect x="0" y="0" width="160" height="46" rx="10" fill="#21262d"/>
        <text x="80" y="18" font-family="'Segoe UI', sans-serif" font-size="11" fill="#8b949e" text-anchor="middle">PROBLEMS SOLVED</text>
        <text x="80" y="38" font-family="'Segoe UI', sans-serif" font-size="20" font-weight="700" fill="url(#accentGradient)" text-anchor="middle" filter="url(#glow)">${totalSolved}</text>
    </g>
    
    ${showRow1 ? `
    <!-- Row 1: Difficulty Breakdown + Activity Stats -->
    <g transform="translate(24, ${row1Y})">
        ${showDifficulty ? `
        <!-- Left: Difficulty Cards -->
        <text x="0" y="0" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#ffa116">📊 DIFFICULTY</text>
        
        <g transform="translate(0, 18)">
            <!-- Easy -->
            <rect x="0" y="0" width="110" height="60" rx="8" fill="#21262d"/>
            <text x="55" y="20" font-family="'Segoe UI', sans-serif" font-size="10" fill="#00b8a3" text-anchor="middle" font-weight="600">EASY</text>
            <text x="55" y="42" font-family="'Segoe UI', sans-serif" font-size="18" font-weight="700" fill="#00b8a3" text-anchor="middle">${solvedEasy}<tspan font-size="11" fill="#6e7681">/${totalEasy}</tspan></text>
            
            <!-- Medium -->
            <rect x="120" y="0" width="110" height="60" rx="8" fill="#21262d" stroke="#ffc01e" stroke-width="1.5"/>
            <text x="175" y="20" font-family="'Segoe UI', sans-serif" font-size="10" fill="#ffc01e" text-anchor="middle" font-weight="600">MEDIUM</text>
            <text x="175" y="42" font-family="'Segoe UI', sans-serif" font-size="18" font-weight="700" fill="#ffc01e" text-anchor="middle">${solvedMedium}<tspan font-size="11" fill="#6e7681">/${totalMedium}</tspan></text>
            
            <!-- Hard -->
            <rect x="240" y="0" width="110" height="60" rx="8" fill="#21262d"/>
            <text x="295" y="20" font-family="'Segoe UI', sans-serif" font-size="10" fill="#ff375f" text-anchor="middle" font-weight="600">HARD</text>
            <text x="295" y="42" font-family="'Segoe UI', sans-serif" font-size="18" font-weight="700" fill="#ff375f" text-anchor="middle">${solvedHard}<tspan font-size="11" fill="#6e7681">/${totalHard}</tspan></text>

            <!-- Beats Stats (if enabled) -->
            ${showBeats ? `
            <text x="55" y="75" font-family="'Segoe UI', sans-serif" font-size="10" fill="#8b949e" text-anchor="middle">Beats ${beatsEasy.toFixed(1)}%</text>
            <text x="175" y="75" font-family="'Segoe UI', sans-serif" font-size="10" fill="#8b949e" text-anchor="middle">Beats ${beatsMedium.toFixed(1)}%</text>
            <text x="295" y="75" font-family="'Segoe UI', sans-serif" font-size="10" fill="#8b949e" text-anchor="middle">Beats ${beatsHard.toFixed(1)}%</text>
            ` : ''}
        </g>
        ` : ''}
        
        ${showActivity ? `
        <!-- Right: Activity/Heatmap -->
        <g transform="translate(${showDifficulty ? 380 : 0}, 0)">
            <text x="0" y="0" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#ffa116">🔥 ACTIVITY</text>
            
            <g transform="translate(0, 18)">
                <rect x="0" y="0" width="85" height="35" rx="6" fill="#21262d"/>
                <text x="42" y="14" font-family="'Segoe UI', sans-serif" font-size="9" fill="#8b949e" text-anchor="middle">🔥 Streak</text>
                <text x="42" y="28" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="700" fill="#ff6b35" text-anchor="middle">${streak}</text>

                <rect x="95" y="0" width="85" height="35" rx="6" fill="#21262d"/>
                <text x="137" y="14" font-family="'Segoe UI', sans-serif" font-size="9" fill="#8b949e" text-anchor="middle">📆 Active</text>
                <text x="137" y="28" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="700" fill="#00b8a3" text-anchor="middle">${totalActiveDays}</text>
                
                <!-- Compact Heatmap -->
                <g transform="translate(190, -8)">
                    ${generateHeatmap(submissionCalendar, 0, 0)}
                </g>
            </g>
        </g>
        ` : ''}
    </g>` : ''}
    
    ${showRow2 ? `
    <!-- Row 2: Top Skill Tags -->
    <g transform="translate(24, ${row2Y})">
        <text x="0" y="0" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#ffa116">🏷️ TOP SKILLS</text>
        
        <g transform="translate(0, 18)">
            ${allTags.length > 0 ? allTags.map((tag, i) => `
                <g transform="translate(${i * 152}, 0)">
                    <rect x="0" y="0" width="145" height="45" rx="8" fill="#21262d"/>
                    <text x="72" y="18" font-family="'Segoe UI', sans-serif" font-size="11" fill="#c9d1d9" text-anchor="middle" font-weight="500">${tag.tagName.length > 14 ? tag.tagName.slice(0, 13) + '…' : tag.tagName}</text>
                    <text x="72" y="35" font-family="'Segoe UI', sans-serif" font-size="10" fill="#ffa116" text-anchor="middle">${tag.problemsSolved} solved</text>
                </g>
            `).join('') : `
                <rect x="0" y="0" width="200" height="45" rx="8" fill="#21262d"/>
                <text x="100" y="28" font-family="'Segoe UI', sans-serif" font-size="11" fill="#6e7681" text-anchor="middle">No skills data available</text>
            `}
        </g>
    </g>` : ''}
    
    ${showRow3 ? `
    <!-- Row 3: Monthly Badges -->
    <g transform="translate(24, ${row3Y})">
        <text x="0" y="0" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#ffa116">🏅 MONTHLY BADGES</text>
        
        <g transform="translate(0, 18)">
            ${recentBadges.length > 0 ? recentBadges.map((badge, i) => `
                <g transform="translate(${i * 152}, 0)">
                    <rect x="0" y="0" width="145" height="40" rx="8" fill="#21262d"/>
                    <text x="72" y="25" font-family="'Segoe UI', sans-serif" font-size="10" fill="#c9d1d9" text-anchor="middle">🏅 ${badge.badge.name.length > 12 ? badge.badge.name.slice(0, 11) + '…' : badge.badge.name}</text>
                </g>
            `).join('') : `
                <rect x="0" y="0" width="300" height="40" rx="8" fill="#21262d"/>
                <text x="150" y="25" font-family="'Segoe UI', sans-serif" font-size="11" fill="#6e7681" text-anchor="middle">Complete monthly challenges to earn badges</text>
            `}
        </g>
    </g>` : ''}

    ${showRow4 ? `
    <!-- Row 4: Recent Submissions -->
    <g transform="translate(24, ${row4Y})">
        <text x="0" y="0" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#ffa116">⚡ RECENT SUBMISSIONS</text>
        
        <g transform="translate(0, 18)">
            ${recentSubs.length > 0 ? recentSubs.map((sub, i) => `
                <g transform="translate(0, ${i * 24})">
                    <text x="0" y="10" font-family="'Segoe UI', sans-serif" font-size="11" fill="#c9d1d9">• ${sub.title}</text>
                    <text x="750" y="10" font-family="'Segoe UI', sans-serif" font-size="10" fill="#8b949e" text-anchor="end">${new Date(parseInt(sub.timestamp) * 1000).toLocaleDateString()}</text>
                </g>
            `).join('') : `
                <text x="0" y="10" font-family="'Segoe UI', sans-serif" font-size="11" fill="#6e7681">No recent submissions found</text>
            `}
        </g>
    </g>` : ''}
    
    <!-- Footer -->
    <text x="780" y="${cardHeight - 10}" font-family="'Segoe UI', sans-serif" font-size="9" fill="#30363d" text-anchor="end">leetcode-stats-card</text>
</svg>`;
}


export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    // Parse visibility options
    const showDifficulty = searchParams.get('difficulty') !== 'false';
    const showActivity = searchParams.get('activity') !== 'false';
    const showStats = searchParams.get('skills') !== 'false';
    const showBadges = searchParams.get('badges') !== 'false';

    // New options (default true)
    const showSubmissions = searchParams.get('submissions') !== 'false';
    const showBeats = searchParams.get('beats') !== 'false';
    const showRank = searchParams.get('rank') !== 'false';

    if (!username) {
        return new NextResponse(
            `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100">
                <rect width="400" height="100" fill="#0d1117" rx="8"/>
                <text x="200" y="55" font-family="sans-serif" font-size="14" fill="#f85149" text-anchor="middle">Error: username parameter is required</text>
            </svg>`,
            {
                status: 400,
                headers: {
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'no-cache',
                },
            }
        );
    }

    try {
        const data = await fetchAllData(username);

        // Check if user exists
        let userExists = false;
        for (const queryKey of Object.keys(data)) {
            const queryData = data[queryKey] as Record<string, unknown> | null;
            if (queryData?.matchedUser) {
                userExists = true;
                break;
            }
        }

        if (!userExists) {
            return new NextResponse(
                `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100">
                    <rect width="400" height="100" fill="#0d1117" rx="8"/>
                    <text x="200" y="55" font-family="sans-serif" font-size="14" fill="#f85149" text-anchor="middle">User "${username}" not found</text>
                </svg>`,
                {
                    status: 404,
                    headers: {
                        'Content-Type': 'image/svg+xml',
                        'Cache-Control': 'no-cache',
                    },
                }
            );
        }

        const svg = generateSVG(username, data, {
            showDifficulty,
            showActivity,
            showStats,
            showBadges,
            showSubmissions,
            showBeats,
            showRank
        });

        return new NextResponse(svg, {
            status: 200,
            headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
            },
        });
    } catch (error) {
        console.error('Error generating card:', error);
        return new NextResponse(
            `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100">
                <rect width="400" height="100" fill="#0d1117" rx="8"/>
                <text x="200" y="55" font-family="sans-serif" font-size="14" fill="#f85149" text-anchor="middle">Error generating card</text>
            </svg>`,
            {
                status: 500,
                headers: {
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'no-cache',
                },
            }
        );
    }
}
