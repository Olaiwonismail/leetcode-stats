'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function StatsForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [username, setUsername] = useState(searchParams.get('username') || '');

    // Existing toggles
    const [difficulty, setDifficulty] = useState(searchParams.get('difficulty') !== 'false');
    const [activity, setActivity] = useState(searchParams.get('activity') !== 'false');
    const [skills, setSkills] = useState(searchParams.get('skills') !== 'false');
    const [badges, setBadges] = useState(searchParams.get('badges') !== 'false');

    // New toggles
    const [submissions, setSubmissions] = useState(searchParams.get('submissions') !== 'false');
    const [beats, setBeats] = useState(searchParams.get('beats') !== 'false');
    const [rank, setRank] = useState(searchParams.get('rank') !== 'false');

    useEffect(() => {
        // Sync state with URL params
        setUsername(searchParams.get('username') || '');
        setDifficulty(searchParams.get('difficulty') !== 'false');
        setActivity(searchParams.get('activity') !== 'false');
        setSkills(searchParams.get('skills') !== 'false');
        setBadges(searchParams.get('badges') !== 'false');
        setSubmissions(searchParams.get('submissions') !== 'false');
        setBeats(searchParams.get('beats') !== 'false');
        setRank(searchParams.get('rank') !== 'false');
    }, [searchParams]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) return;

        const params = new URLSearchParams();
        params.set('username', username);

        // Only set if false (default is true)
        if (!difficulty) params.set('difficulty', 'false');
        if (!activity) params.set('activity', 'false');
        if (!skills) params.set('skills', 'false');
        if (!badges) params.set('badges', 'false');
        if (!submissions) params.set('submissions', 'false');
        if (!beats) params.set('beats', 'false');
        if (!rank) params.set('rank', 'false');

        router.push(`/?${params.toString()}`);
    };

    return (
        <form className="form-card" onSubmit={handleSubmit}>
            {/* Username Input */}
            <div className="input-group">
                <label htmlFor="username">LeetCode Username</label>
                <input
                    type="text"
                    id="username"
                    name="username"
                    placeholder="e.g., neal_wu"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="username-input"
                />
            </div>

            {/* Section Toggles */}
            <div className="toggles-group">
                <label className="toggle-label">Include Sections:</label>
                <div className="toggles-grid">
                    <label className="checkbox-item">
                        <input
                            type="checkbox"
                            checked={difficulty}
                            onChange={(e) => setDifficulty(e.target.checked)}
                        />
                        <span className="checkbox-text">Difficulty Breakdown</span>
                    </label>
                    <label className="checkbox-item">
                        <input
                            type="checkbox"
                            checked={activity}
                            onChange={(e) => setActivity(e.target.checked)}
                        />
                        <span className="checkbox-text">Submission Heatmap</span>
                    </label>
                    <label className="checkbox-item">
                        <input
                            type="checkbox"
                            checked={skills}
                            onChange={(e) => setSkills(e.target.checked)}
                        />
                        <span className="checkbox-text">Top Skill Tags</span>
                    </label>
                    <label className="checkbox-item">
                        <input
                            type="checkbox"
                            checked={badges}
                            onChange={(e) => setBadges(e.target.checked)}
                        />
                        <span className="checkbox-text">Monthly Badges</span>
                    </label>
                    <label className="checkbox-item">
                        <input
                            type="checkbox"
                            checked={submissions}
                            onChange={(e) => setSubmissions(e.target.checked)}
                        />
                        <span className="checkbox-text">Recent Submissions</span>
                    </label>
                    <label className="checkbox-item">
                        <input
                            type="checkbox"
                            checked={beats}
                            onChange={(e) => setBeats(e.target.checked)}
                        />
                        <span className="checkbox-text">Beats Percentage</span>
                    </label>
                    <label className="checkbox-item">
                        <input
                            type="checkbox"
                            checked={rank}
                            onChange={(e) => setRank(e.target.checked)}
                        />
                        <span className="checkbox-text">Global Ranking</span>
                    </label>
                </div>
            </div>

            {/* Submit Button */}
            <button type="submit" className="submit-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                </svg>
                Generate Card
            </button>

            <style jsx>{`
        .toggles-group {
          margin-bottom: 24px;
        }
        .toggle-label {
          display: block;
          margin-bottom: 12px;
          color: #8b949e;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .toggles-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          background: #21262d;
          border: 1px solid #30363d;
          transition: all 0.2s ease;
        }
        .checkbox-item:hover {
          background: #30363d;
          border-color: #8b949e;
        }
        .checkbox-item input[type='checkbox'] {
          accent-color: #ffa116;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }
        .checkbox-text {
          font-size: 0.9rem;
          color: #c9d1d9;
        }
      `}</style>
        </form>
    );
}
