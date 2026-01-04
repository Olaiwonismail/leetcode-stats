import { fetchLeetCodeStats } from './lib/leetcode-queries';
import { CopyButton } from './components/CopyButton';
import { CopyUrlButton } from './components/CopyUrlButton';
import { StatsForm } from './components/StatsForm';
import { ScrollToResults } from './components/ScrollToResults';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const username = typeof params.username === 'string' ? params.username : '';

  let data: Record<string, unknown> | null = null;
  let error: string | null = null;

  // Fetch logic
  if (username) {
    try {
      data = await fetchLeetCodeStats(username);

      // Check if user exists by verifying matchedUser
      const hasValidData = Object.values(data).some((categoryData) => {
        const d = categoryData as Record<string, unknown>;
        return d?.matchedUser !== null || d?.userContestRanking !== undefined;
      });

      if (!hasValidData) {
        const allNull = Object.values(data).every((categoryData) => {
          const d = categoryData as Record<string, unknown>;
          return d?.matchedUser === null && d?.userContestRanking === null;
        });
        if (allNull) {
          error = `User "${username}" not found on LeetCode`;
          data = null;
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to fetch data';
    }
  }

  const jsonString = data ? JSON.stringify(data, null, 2) : '';

  // Construct Card URL with params
  const cardParams = new URLSearchParams();
  if (username) cardParams.set('username', username);

  // Default is true, so only set false if explicitly false
  if (params.difficulty === 'false') cardParams.set('difficulty', 'false');
  if (params.activity === 'false') cardParams.set('activity', 'false');
  if (params.skills === 'false') cardParams.set('skills', 'false');
  if (params.badges === 'false') cardParams.set('badges', 'false');
  if (params.submissions === 'false') cardParams.set('submissions', 'false');
  if (params.beats === 'false') cardParams.set('beats', 'false');
  if (params.rank === 'false') cardParams.set('rank', 'false');

  const cardUrl = username ? `/api/card?${cardParams.toString()}` : '';

  return (
    <div className="page-container">
      <main className="main-content">
        {/* Header */}
        <header className="header">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.102 17.93l-2.697 2.607c-.466.467-1.111.662-1.823.662s-1.357-.195-1.824-.662l-4.332-4.363c-.467-.467-.702-1.15-.702-1.863s.235-1.357.702-1.824l4.319-4.38c.467-.467 1.125-.645 1.837-.645s1.357.195 1.823.662l2.697 2.606c.514.515 1.365.497 1.9-.038.535-.536.553-1.387.039-1.901l-2.609-2.636a5.055 5.055 0 0 0-2.445-1.337l2.467-2.503c.516-.514.498-1.366-.037-1.901-.535-.535-1.387-.552-1.902-.038l-10.1 10.101c-.981.982-1.494 2.337-1.494 3.835 0 1.498.513 2.895 1.494 3.875l4.347 4.361c.981.979 2.337 1.452 3.834 1.452s2.853-.512 3.835-1.494l2.609-2.637c.514-.514.496-1.365-.039-1.9s-1.386-.553-1.899-.039zM20.811 13.01H10.666c-.702 0-1.27.604-1.27 1.346s.568 1.346 1.27 1.346h10.145c.701 0 1.27-.604 1.27-1.346s-.569-1.346-1.27-1.346z" fill="#FFA116" />
            </svg>
            <h1>LeetCode Stats Card</h1>
          </div>
          <p className="subtitle">Generate a showcase card for your LeetCode profile</p>
        </header>

        {/* Info Section */}

        {/* Form */}
        <StatsForm />

        {/* Error Message */}
        {error && (
          <div className="error-card">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        )}

        {/* Empty State */}
        {!data && !error && (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <p>Enter a username to generate your LeetCode stats card</p>
          </div>
        )}

        {/* Results Section */}
        {data && (
          <div id="results-section">
            <ScrollToResults targetId="results-section" />

            {/* Profile Card Preview */}
            <div className="card-preview">
              <div className="card-header">
                <span className="card-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  Stats Card for @{username}
                </span>
              </div>
              <div className="card-image-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cardUrl}
                  alt={`LeetCode stats card for ${username}`}
                  className="card-image"
                />
              </div>
              <p className="card-note">
                Note: Sections can be customized using the checkboxes above.
              </p>
            </div>

            {/* Card URL Section */}
            <div className="url-section">
              <div className="url-header">
                <span className="url-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                  Card URL (for embedding)
                </span>
                <CopyUrlButton path={cardUrl} />
              </div>
              <div className="url-content">
                <code>{cardUrl}</code>
              </div>
            </div>

            {/* JSON Output */}
            <div className="json-card">
              <div className="json-header">
                <span className="json-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                  </svg>
                  API JSON Response
                </span>
                <CopyButton text={jsonString} label="Copy JSON" />
              </div>
              <pre className="json-content">
                <code>{jsonString}</code>
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>Data fetched from LeetCode GraphQL API</p>
      </footer>
    </div>
  );
}
