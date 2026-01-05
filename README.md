# LeetCode Stats Card

A Next.js application that generates dynamic, customizable LeetCode statistics cards for your GitHub profile or personal website.

## Features

- **Dynamic Stats**: Fetches real-time data from LeetCode via GraphQL.
- **Customizable**: Choose which sections to display:
  - Difficulty Breakdown (Easy/Medium/Hard)
  - Submission Heatmap & Streak
  - Top Skill Tags
  - Monthly Badges
  - Recent Submissions
  - Global Ranking & Beats Percentage
- **Themeable**: Dark mode inspired design with LeetCode colors.
- **Easy Sharing**: Generates a direct URL or Markdown snippet for easy embedding.

## Getting Started

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Run the development server**:
   ```bash
   pnpm run dev
   ```

3. **Open the app**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. Enter your LeetCode username.
2. Select the sections you want to include in your card.
3. Click **"Generate Card"**.
4. Copy the generated **Markdown** snippet and paste it into your `README.md`.

### Example Markdown

```markdown
[![LeetCode Stats](https://your-domain.com/api/card?username=neal_wu&difficulty=true&activity=true&skills=true)](https://leetcode.com/neal_wu)
```

## API

The card image is generated via the `/api/card` endpoint.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `username` | string | required | LeetCode username |
| `difficulty` | boolean | true | Show difficulty breakdown |
| `activity` | boolean | true | Show submission heatamp & streak |
| `skills` | boolean | true | Show top skill tags |
| `badges` | boolean | true | Show monthly badges |
| `submissions` | boolean | true | Show recent submissions |
| `beats` | boolean | true | Show percentile stats |
| `rank` | boolean | true | Show global ranking |

## Technologies

- [Next.js](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [TailwindCSS](https://tailwindcss.com/)
