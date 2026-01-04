import { ImageResponse } from 'next/og';

export async function GET(request: Request, { params }: { params: { username: string } }) {
  const { username } = params;

  // 1. Fetch data from LeetCode
  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            submitStats: submitStatsGlobal {
              acSubmissionNum { difficulty, count }
            }
          }
        }`,
      variables: { username },
    }),
  });

  const data = await response.json();
  const stats = data.data.matchedUser.submitStats.acSubmissionNum;
  const totalSolved = stats.find((s: any) => s.difficulty === 'All').count;

  // 2. Draw the Image (SVG)
  return new ImageResponse(
    (
      <div style={{
        display: 'flex', fontSize: 40, color: 'white', background: '#1a1a1a',
        width: '100%', height: '100%', padding: '40px', borderRadius: '12px',
        flexDirection: 'column', border: '2px solid #333'
      }}>
        <span style={{ fontSize: 24, color: '#ffa116' }}>LeetCode Stats</span>
        <span style={{ fontSize: 60, fontWeight: 'bold' }}>{username}</span>
        <div style={{ display: 'flex', marginTop: '20px' }}>
          <span>Solved: {totalSolved}</span>
        </div>
      </div>
    ),
    { width: 500, height: 300 }
  );
}