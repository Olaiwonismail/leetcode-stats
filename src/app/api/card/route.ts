import { NextRequest, NextResponse } from 'next/server';
import { queries, LEETCODE_API_URL, QueryKey } from '../../lib/leetcode-queries';

// Fetch all LeetCode data for the card
async function fetchAllData(username: string) {
    const results: Record<string, unknown> = {};
    const queryKeys: QueryKey[] = ['problems', 'activity', 'skills', 'profile', 'submissions'];
    const currentYear = new Date().getFullYear();

    for (const queryKey of queryKeys) {
        const query = queries[queryKey];
        try {
            if (queryKey === 'activity') {
                // Fetch current and previous year to support trailing 12 months
                const [currData, prevData] = await Promise.all([
                    fetch(LEETCODE_API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' },
                        body: JSON.stringify({ query, variables: { username, year: currentYear } }),
                        next: { revalidate: 300 },
                    }).then(r => r.json()),
                    fetch(LEETCODE_API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' },
                        body: JSON.stringify({ query, variables: { username, year: currentYear - 1 } }),
                        next: { revalidate: 300 },
                    }).then(r => r.json())
                ]);

                // Merge calendars
                const currCal = JSON.parse(currData.data?.matchedUser?.userCalendar?.submissionCalendar || '{}');
                const prevCal = JSON.parse(prevData.data?.matchedUser?.userCalendar?.submissionCalendar || '{}');
                const mergedCal = { ...prevCal, ...currCal };

                results[queryKey] = {
                    matchedUser: {
                        userCalendar: {
                            ...currData.data?.matchedUser?.userCalendar,
                            submissionCalendar: JSON.stringify(mergedCal)
                        }
                    }
                };
            } else {
                // Standard fetch for other keys
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
                            ...(queryKey === 'submissions' ? { limit: 5 } : {})
                        },
                    }),
                    next: { revalidate: 300 },
                });
                const data = await response.json();
                results[queryKey] = data.data;
            }
        } catch {
            results[queryKey] = null;
        }
    }
    return results;
}

// Generate heatmap squares from submission calendar - compact version
function generateHeatmap(submissionCalendar: string | null, startX: number, startY: number): string {
    const weeks = 53; // Full year history

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
    const squares: string[] = [];
    const labels: string[] = [];

    // Normalize calendar keys to timestamps (seconds)
    const normalizedCalendar: Record<string, number> = {};
    Object.keys(calendar).forEach(key => {
        normalizedCalendar[key] = calendar[key];
    });

    const now = new Date();
    // Normalize now to start of day to avoid time drift issues
    now.setHours(0, 0, 0, 0);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let lastMonth = -1;

    // Generate last 53 weeks
    for (let week = weeks - 1; week >= 0; week--) {
        const date = new Date(now);
        // Calculate date for the start of this week column
        // (week * 7) days ago is the end of the week, so subtract more for the start?
        // Actually, let's just use the date of the first cell (Standard layout usually has Sunday at top)
        // 6 - day(0) = 6. 
        date.setDate(date.getDate() - (week * 7 + 6));
        const currentMonth = date.getMonth();

        const x = startX + (weeks - 1 - week) * 12;

        // Add month label if month changes
        // Only add if we aren't too close to the edge (index 0 might be cut off if we checked weeks-1)
        // Check if it's the first column OR if month changed
        if (currentMonth !== lastMonth) {
            // Don't show label for the very last column if it changed there (too cramped?)
            // But usually it's fine.
            labels.push(`<text x="${x}" y="${startY - 6}" font-family="'Segoe UI', sans-serif" font-size="9" fill="#8b949e">${monthNames[currentMonth]}</text>`);
            lastMonth = currentMonth;
        }

        for (let day = 0; day < 7; day++) {
            // Calculate date for this cell
            const cellDate = new Date(now);
            cellDate.setDate(cellDate.getDate() - (week * 7 + (6 - day)));

            // Convert to start of day timestamp (seconds)
            const startOfDay = Math.floor(cellDate.getTime() / 1000);
            const endOfDay = startOfDay + 86400;

            let count = 0;
            if (normalizedCalendar[startOfDay.toString()]) {
                count = normalizedCalendar[startOfDay.toString()];
            } else {
                for (const [tsStr, c] of Object.entries(normalizedCalendar)) {
                    const ts = parseInt(tsStr);
                    if (ts >= startOfDay && ts < endOfDay) {
                        count += (c as number);
                    }
                }
            }

            let color = '#161b22'; // empty/bg matches panel
            if (count > 0 && count <= 2) color = '#0e4429';
            else if (count > 2 && count <= 5) color = '#006d32';
            else if (count > 5 && count <= 10) color = '#26a641';
            else if (count > 10) color = '#39d353';

            const y = startY + day * 12;
            squares.push(`<rect x="${x}" y="${y}" width="9" height="9" rx="2" fill="${color}" stroke="#0d1117" stroke-width="1"/>`);
        }
    }
    return labels.join('') + squares.join('');
}

// Generate the SVG card - Modern Dashboard Design
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

    // Extract data
    const problems = data.problems as any;
    const activity = data.activity as any;
    const skills = data.skills as any;
    const profile = data.profile as any;
    const submissions = data.submissions as any;

    // Stats
    const allQuestions = problems?.allQuestionsCount || [];
    const acSubmissions = problems?.matchedUser?.submitStatsGlobal?.acSubmissionNum || [];
    const beatsStats = problems?.matchedUser?.problemsSolvedBeatsStats || [];

    const getCount = (arr: any[], diff: string) => arr.find(q => q.difficulty === diff)?.count || 0;
    const totalEasy = getCount(allQuestions, 'Easy');
    const totalMedium = getCount(allQuestions, 'Medium');
    const totalHard = getCount(allQuestions, 'Hard');
    const solvedEasy = getCount(acSubmissions, 'Easy');
    const solvedMedium = getCount(acSubmissions, 'Medium');
    const solvedHard = getCount(acSubmissions, 'Hard');
    const totalSolved = solvedEasy + solvedMedium + solvedHard;

    const getBeats = (diff: string) => beatsStats.find((s: any) => s.difficulty === diff)?.percentage ?? 0;
    const beatsEasy = getBeats('Easy');
    const beatsMedium = getBeats('Medium');
    const beatsHard = getBeats('Hard');

    const allTags = skills ? [
        ...(skills?.matchedUser?.tagProblemCounts?.fundamental || []),
        ...(skills?.matchedUser?.tagProblemCounts?.intermediate || []),
        ...(skills?.matchedUser?.tagProblemCounts?.advanced || []),
    ].sort((a: any, b: any) => b.problemsSolved - a.problemsSolved).slice(0, 6) : [];

    const streak = activity?.matchedUser?.userCalendar?.streak || 0;
    const totalActiveDays = activity?.matchedUser?.userCalendar?.totalActiveDays || 0;
    const submissionCalendar = activity?.matchedUser?.userCalendar?.submissionCalendar || null;

    const recentBadges = (activity?.matchedUser?.userCalendar?.dccBadges || []).slice(-3).reverse();
    const recentSubs = (submissions?.recentAcSubmissionList || []).slice(0, 5);

    const realName = profile?.matchedUser?.profile?.realName || '';
    const ranking = profile?.matchedUser?.profile?.ranking || 0;

    // Layout Constants
    const CARD_WIDTH = 800;
    const PADDING = 20;
    const COL_GAP = 20;
    const ROW_GAP = 20;
    const COL_WIDTH = (CARD_WIDTH - (PADDING * 2) - COL_GAP) / 2; // ~370px

    let currentY = 80; // Header height

    // --- Helpers ---
    const Panel = (x: number, y: number, w: number, h: number) =>
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#161b22" stroke="#30363d" stroke-width="1" fill-opacity="0.8"/>`;

    // --- Sections ---

    // 1. Overview (Difficulty & Total)
    let overviewHeight = 0;
    if (showDifficulty) {
        overviewHeight = 140;
    }

    // 2. Activity (Heatmap)
    let activityHeight = 0;
    if (showActivity) {
        activityHeight = 150;
    }

    // 3. Skills & Submissions (Grid)
    let gridHeight = 0;
    if (showStats || showSubmissions) {
        gridHeight = 220;
    }

    // 4. Badges (Bottom)
    let badgesHeight = 0;
    if (showBadges) {
        badgesHeight = 90;
    }

    // Total Calculation
    const totalHeight = currentY +
        (showDifficulty ? overviewHeight + ROW_GAP : 0) +
        (showActivity ? activityHeight + ROW_GAP : 0) +
        ((showStats || showSubmissions) ? gridHeight + ROW_GAP : 0) +
        (showBadges ? badgesHeight + ROW_GAP : 0) + 10; // Padding bottom

    // --- Rendering ---
    let svgContent = '';

    // Header
    svgContent += `
        <defs>
            <linearGradient id="textGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#ffffff"/>
                <stop offset="100%" style="stop-color:#b1b8be"/>
            </linearGradient>
            <filter id="shadow">
                <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.3"/>
            </filter>
        </defs>
        
        <!-- Logo & Title -->
        <g transform="translate(${PADDING}, 24)">
             <path d="M13.483 11.954l-1.798 1.738c-.31.31-.74.44-1.215.44s-.905-.13-1.215-.44l-2.888-2.908c-.31-.31-.468-.766-.468-1.242s.157-.905.468-1.216l2.88-2.92c.31-.31.75-.43 1.224-.43s.905.13 1.215.44l1.798 1.738c.343.343.91.33 1.267-.025.357-.358.369-.925.026-1.267l-1.74-1.757a3.37 3.37 0 0 0-1.63-.892l1.645-1.668c.344-.343.332-.91-.025-1.267-.357-.357-.924-.368-1.267-.025l-6.733 6.733c-.654.655-.996 1.558-.996 2.557 0 .999.342 1.93.996 2.583l2.898 2.907c.654.653 1.558.968 2.556.968s1.902-.341 2.556-.996l1.74-1.758c.342-.343.33-.91-.026-1.267s-.924-.369-1.267-.026zM13.874 8.673H7.11c-.468 0-.847.403-.847.898s.379.897.847.897h6.764c.468 0 .847-.402.847-.897s-.379-.898-.847-.898z" fill="#FFA116" transform="scale(1.5)"/>
             <text x="36" y="22" font-family="'Segoe UI', sans-serif" font-size="18" font-weight="700" fill="#ffffff">LeetCode Stats</text>
        </g>

        <!-- User Info (Right) -->
        <g transform="translate(${CARD_WIDTH - PADDING}, 24)" text-anchor="end">
            <text x="0" y="10" font-family="'Segoe UI', sans-serif" font-size="24" font-weight="700" fill="#ffffff">@${username}</text>
            ${showRank && ranking > 0 ? `<text x="0" y="30" font-family="'Segoe UI', sans-serif" font-size="12" fill="#8b949e">Global Rank #${ranking.toLocaleString()}</text>` : ''}
        </g>
        
        <line x1="${PADDING}" y1="65" x2="${CARD_WIDTH - PADDING}" y2="65" stroke="#30363d" stroke-width="1" opacity="0.5"/>
    `;

    // 1. Difficulty Section
    if (showDifficulty) {
        const barWidth = 220;
        const barHeight = 8;

        svgContent += `
        <g transform="translate(${PADDING}, ${currentY})">
            ${Panel(0, 0, CARD_WIDTH - (PADDING * 2), overviewHeight)}
            
            <!-- Title -->
            <text x="20" y="30" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="600" fill="#ffa116">SOLVED PROBLEMS</text>
            
            <!-- Total Count (Big Number) -->
            <g transform="translate(620, 30)">
                 <text x="0" y="50" font-family="'Segoe UI', sans-serif" font-size="48" font-weight="800" fill="#ffffff" text-anchor="middle" filter="url(#shadow)">${totalSolved}</text>
                 <text x="0" y="75" font-family="'Segoe UI', sans-serif" font-size="12" fill="#8b949e" text-anchor="middle">TOTAL SOLVED</text>
            </g>

            <!-- Bars Container -->
            <g transform="translate(20, 50)">
                <!-- Easy -->
                <g transform="translate(0, 0)">
                    <text x="0" y="10" font-family="'Segoe UI', sans-serif" font-size="12" fill="#00b8a3" font-weight="600">Easy</text>
                    <text x="50" y="10" font-family="'Segoe UI', sans-serif" font-size="12" fill="#ffffff" font-weight="600">${solvedEasy} <tspan fill="#6e7681" font-weight="400">/ ${totalEasy}</tspan></text>
                     ${showBeats ? `<text x="${barWidth}" y="10" font-family="'Segoe UI', sans-serif" font-size="11" fill="#8b949e" text-anchor="end">Beats ${beatsEasy.toFixed(1)}%</text>` : ''}
                    
                    <rect x="0" y="20" width="${barWidth}" height="${barHeight}" rx="4" fill="#2d333b"/>
                    <rect x="0" y="20" width="${Math.max(barWidth * (solvedEasy / Math.max(totalEasy, 1)), 6)}" height="${barHeight}" rx="4" fill="#00b8a3"/>
                </g>

                <!-- Medium -->
                <g transform="translate(280, 0)">
                    <text x="0" y="10" font-family="'Segoe UI', sans-serif" font-size="12" fill="#ffc01e" font-weight="600">Medium</text>
                    <text x="60" y="10" font-family="'Segoe UI', sans-serif" font-size="12" fill="#ffffff" font-weight="600">${solvedMedium} <tspan fill="#6e7681" font-weight="400">/ ${totalMedium}</tspan></text>
                    ${showBeats ? `<text x="${barWidth}" y="10" font-family="'Segoe UI', sans-serif" font-size="11" fill="#8b949e" text-anchor="end">Beats ${beatsMedium.toFixed(1)}%</text>` : ''}

                    <rect x="0" y="20" width="${barWidth}" height="${barHeight}" rx="4" fill="#2d333b"/>
                    <rect x="0" y="20" width="${Math.max(barWidth * (solvedMedium / Math.max(totalMedium, 1)), 6)}" height="${barHeight}" rx="4" fill="#ffc01e"/>
                </g>

                <!-- Hard -->
                <g transform="translate(0, 50)">
                    <text x="0" y="10" font-family="'Segoe UI', sans-serif" font-size="12" fill="#ff375f" font-weight="600">Hard</text>
                    <text x="50" y="10" font-family="'Segoe UI', sans-serif" font-size="12" fill="#ffffff" font-weight="600">${solvedHard} <tspan fill="#6e7681" font-weight="400">/ ${totalHard}</tspan></text>
                    ${showBeats ? `<text x="${barWidth}" y="10" font-family="'Segoe UI', sans-serif" font-size="11" fill="#8b949e" text-anchor="end">Beats ${beatsHard.toFixed(1)}%</text>` : ''}
                    
                    <rect x="0" y="20" width="${barWidth}" height="${barHeight}" rx="4" fill="#2d333b"/>
                    <rect x="0" y="20" width="${Math.max(barWidth * (solvedHard / Math.max(totalHard, 1)), 6)}" height="${barHeight}" rx="4" fill="#ff375f"/>
                </g>
            </g>
        </g>`;
        currentY += overviewHeight + ROW_GAP;
    }

    // 2. Activity / Heatmap
    if (showActivity) {
        svgContent += `
        <g transform="translate(${PADDING}, ${currentY})">
            ${Panel(0, 0, CARD_WIDTH - (PADDING * 2), activityHeight)}
            <text x="20" y="30" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="600" fill="#ffa116">ACTIVITY HEATMAP</text>
            
            <g transform="translate(${CARD_WIDTH - PADDING - 40}, 30)" text-anchor="end">
                <text font-family="'Segoe UI', sans-serif" font-size="12" fill="#c9d1d9">
                    Streak: <tspan fill="#ffffff" font-weight="700">${streak}</tspan>  |  Active: <tspan fill="#ffffff" font-weight="700">${totalActiveDays}</tspan>
                </text>
            </g>

            <g transform="translate(20, 50)">
                 ${generateHeatmap(submissionCalendar, 0, 0)}
            </g>
        </g>`;
        currentY += activityHeight + ROW_GAP;
    }

    // 3. Grid Row (Skills & Submissions)
    if (showStats || showSubmissions) {
        const boxHeight = gridHeight;

        // Left Column: Skills
        if (showStats) {
            const width = showSubmissions ? COL_WIDTH : CARD_WIDTH - (PADDING * 2);
            svgContent += `
             <g transform="translate(${PADDING}, ${currentY})">
                ${Panel(0, 0, width, boxHeight)}
                <text x="20" y="30" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="600" fill="#ffa116">TOP SKILLS</text>
                
                <g transform="translate(20, 50)">
                    ${allTags.length > 0 ? allTags.map((tag: any, i: number) => {
                const col = i % 2;
                const row = Math.floor(i / 2);
                return `
                        <g transform="translate(${col * (width / 2 - 10)}, ${row * 50})">
                            <rect width="${width / 2 - 20}" height="40" rx="6" fill="#21262d"/>
                            <text x="10" y="25" font-family="'Segoe UI', sans-serif" font-size="12" fill="#c9d1d9">${tag.tagName}</text>
                            <text x="${width / 2 - 30}" y="25" font-family="'Segoe UI', sans-serif" font-size="12" fill="#ffa116" text-anchor="end">x${tag.problemsSolved}</text>
                        </g>`;
            }).join('') : `<text x="0" y="20" fill="#6e7681" font-size="12">No skills data</text>`}
                </g>
             </g>`;
        }

        // Right Column: Recent Submissions
        if (showSubmissions) {
            const xOffset = showStats ? PADDING + COL_WIDTH + COL_GAP : PADDING;
            const width = showStats ? COL_WIDTH : CARD_WIDTH - (PADDING * 2);

            svgContent += `
             <g transform="translate(${xOffset}, ${currentY})">
                ${Panel(0, 0, width, boxHeight)}
                <text x="20" y="30" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="600" fill="#ffa116">RECENT SUBMISSIONS</text>
                
                <g transform="translate(20, 50)">
                    ${recentSubs.length > 0 ? recentSubs.map((sub: any, i: number) => `
                        <g transform="translate(0, ${i * 32})">
                            <text x="0" y="10" font-family="'Segoe UI', sans-serif" font-size="12" fill="#c9d1d9">${sub.title.length > 30 ? sub.title.slice(0, 28) + '...' : sub.title}</text>
                            <text x="${width - 40}" y="10" font-family="'Segoe UI', sans-serif" font-size="11" fill="#8b949e" text-anchor="end">${new Date(parseInt(sub.timestamp) * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>
                        </g>
                    `).join('') : `<text x="0" y="20" fill="#6e7681" font-size="12">No recent submissions</text>`}
                </g>
             </g>`;
        }

        currentY += gridHeight + ROW_GAP;
    }

    // 4. Badges
    if (showBadges) {
        svgContent += `
        <g transform="translate(${PADDING}, ${currentY})">
            ${Panel(0, 0, CARD_WIDTH - (PADDING * 2), badgesHeight)}
            <text x="20" y="30" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="600" fill="#ffa116">BADGES</text>
            
            <g transform="translate(20, 50)">
                 ${recentBadges.length > 0 ? recentBadges.map((badge: any, i: number) => `
                    <g transform="translate(${i * 140}, 0)">
                        <rect width="130" height="30" rx="15" fill="#2d333b"/>
                        <text x="65" y="20" font-family="'Segoe UI', sans-serif" font-size="11" fill="#c9d1d9" text-anchor="middle">🏅 ${badge.badge.name.length > 15 ? badge.badge.name.slice(0, 15) + '...' : badge.badge.name}</text>
                    </g>
                 `).join('') : `<text x="0" y="20" fill="#6e7681" font-size="12">No recent badges</text>`}
            </g>
        </g>`;
        currentY += badgesHeight + ROW_GAP;
    }

    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${totalHeight}" viewBox="0 0 ${CARD_WIDTH} ${totalHeight}">
        <rect width="${CARD_WIDTH}" height="${totalHeight}" fill="#0d1117" rx="16"/>
        <rect width="${CARD_WIDTH}" height="${totalHeight}" fill="url(#bgGradient)" rx="16" fill-opacity="0.5"/>
        <defs>
             <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#161b22"/>
                <stop offset="100%" style="stop-color:#0d1117"/>
            </linearGradient>
        </defs>
        ${svgContent}
        <text x="${CARD_WIDTH / 2}" y="${totalHeight - 12}" font-family="'Segoe UI', sans-serif" font-size="10" fill="#30363d" text-anchor="middle">Generated by leetcode-stats-card</text>
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
