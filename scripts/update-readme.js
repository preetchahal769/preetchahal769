const fs = require('fs');

async function main() {
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    if (!token) {
        console.error("No GitHub token provided. Skipping stats update.");
        process.exit(0);
    }
    
    console.log("Fetching stats for preetchahal769...");

    const query = `
      query userInfo($login: String!) {
        user(login: $login) {
          name
          login
          contributionsCollection {
            totalCommitContributions
            restrictedContributionsCount
          }
          repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) {
            totalCount
          }
          pullRequests(first: 1) {
            totalCount
          }
          issues(first: 1) {
            totalCount
          }
          followers {
            totalCount
          }
          repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: {field: STARGAZERS, direction: DESC}) {
            totalCount
            nodes {
              stargazers {
                totalCount
              }
              languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                edges {
                  size
                  node {
                    name
                    color
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = { login: "preetchahal769" };
    
    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Authorization': `bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, variables })
    });
    
    const res = await response.json();
    if (res.errors) {
        console.error(res.errors);
        process.exit(1);
    }

    const user = res.data.user;
    
    const totalCommits = user.contributionsCollection.totalCommitContributions + user.contributionsCollection.restrictedContributionsCount;
    const totalRepos = user.repositories.totalCount;
    const totalPRs = user.pullRequests.totalCount;
    const totalIssues = user.issues.totalCount;
    const followers = user.followers.totalCount;
    
    let totalStars = 0;
    const langMap = {};
    let totalSize = 0;

    user.repositories.nodes.forEach(repo => {
        totalStars += repo.stargazers.totalCount;
        repo.languages.edges.forEach(edge => {
            if (!langMap[edge.node.name]) {
                langMap[edge.node.name] = { color: edge.node.color, size: 0 };
            }
            langMap[edge.node.name].size += edge.size;
            totalSize += edge.size;
        });
    });

    const langs = Object.entries(langMap)
        .sort((a, b) => b[1].size - a[1].size)
        .slice(0, 6);

    let statsMarkdown = `
<table width="100%">
  <tr>
    <td width="50%">
      <h3 align="center">🔥 GitHub Stats</h3>
      <br />
      <ul>
        <li><b>⭐ Total Stars:</b> ${totalStars}</li>
        <li><b>🔄 Total Commits:</b> ${totalCommits}</li>
        <li><b>🔀 Pull Requests:</b> ${totalPRs}</li>
        <li><b>🐞 Issues:</b> ${totalIssues}</li>
        <li><b>📦 Repositories:</b> ${totalRepos}</li>
        <li><b>👥 Followers:</b> ${followers}</li>
      </ul>
    </td>
    <td width="50%">
      <h3 align="center">💻 Top Languages</h3>
      <br />
      <ul>
`;

    langs.forEach(([name, data]) => {
        const percent = ((data.size / totalSize) * 100).toFixed(1);
        const emoji = name === 'JavaScript' ? '🟡' : name === 'TypeScript' ? '🔵' : name === 'Rust' ? '🦀' : name === 'HTML' ? '🟠' : name === 'CSS' ? '🔷' : '🔘';
        statsMarkdown += `        <li>${emoji} <b>${name}</b>: ${percent}%</li>\n`;
    });

    statsMarkdown += `      </ul>
    </td>
  </tr>
</table>
`;

    const readmePath = 'README.md';
    let readme = fs.readFileSync(readmePath, 'utf8');
    
    const startMarker = '<!-- STATS:START -->';
    const endMarker = '<!-- STATS:END -->';
    
    const startIndex = readme.indexOf(startMarker);
    const endIndex = readme.indexOf(endMarker);
    
    if (startIndex !== -1 && endIndex !== -1) {
        readme = readme.substring(0, startIndex + startMarker.length) + '\n' + statsMarkdown + '\n' + readme.substring(endIndex);
        fs.writeFileSync(readmePath, readme);
        console.log("README updated successfully!");
    } else {
        console.error("Markers not found in README.md");
        process.exit(1);
    }
}

main();
