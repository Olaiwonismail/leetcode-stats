// GraphQL queries for LeetCode API

export const LEETCODE_API_URL = 'https://leetcode.com/graphql';

// Queries focused on the 5 key junior developer stats
export const queries = {
  // Problem solving data - for Difficulty Breakdown & Total Solved
  problems: `
    query userProblemsSolved($username: String!) {
      allQuestionsCount {
        difficulty
        count
      }
      matchedUser(username: $username) {
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
          totalSubmissionNum {
            difficulty
            count
            submissions
          }
        }
        problemsSolvedBeatsStats {
          difficulty
          percentage
        }
      }
    }
  `,

  // Activity data - for Submission Heatmap & Monthly Challenge Badges
  activity: `
    query userProfileCalendar($username: String!, $year: Int) {
      matchedUser(username: $username) {
        userCalendar(year: $year) {
          activeYears
          streak
          totalActiveDays
          dccBadges {
            timestamp
            badge {
              name
              icon
            }
          }
          submissionCalendar
        }
      }
    }
  `,

  // Skills data - for Top Skill Tags
  skills: `
    query skillAndLanguageStats($username: String!) {
      matchedUser(username: $username) {
        languageProblemCount {
          languageName
          problemsSolved
        }
        tagProblemCounts {
          advanced {
            tagName
            tagSlug
            problemsSolved
          }
          intermediate {
            tagName
            tagSlug
            problemsSolved
          }
          fundamental {
            tagName
            tagSlug
            problemsSolved
          }
        }
      }
    }
  `,

  // Profile data - for username display and basic info
  profile: `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          userAvatar
          ranking
        }
        badges {
          id
          displayName
          icon
          creationDate
        }
        activeBadge {
          id
          displayName
          icon
        }
      }
    }
  `,
};

export type QueryKey = keyof typeof queries;

export async function fetchLeetCodeStats(username: string): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};
  const queryKeys: QueryKey[] = ['problems', 'activity', 'skills', 'profile'];

  for (const queryKey of queryKeys) {
    const query = queries[queryKey];
    if (!query) continue;

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
            ...(queryKey === 'activity' ? { year: new Date().getFullYear() } : {})
          },
        }),
        next: { revalidate: 60 },
      });

      const data = await response.json();

      if (data.errors) {
        results[queryKey] = { error: data.errors[0]?.message || 'Unknown error' };
      } else {
        results[queryKey] = data.data;
      }
    } catch (error) {
      results[queryKey] = {
        error: error instanceof Error ? error.message : 'Failed to fetch'
      };
    }
  }

  return results;
}
