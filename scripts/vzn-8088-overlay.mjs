import fs from 'node:fs/promises';

const token = process.env.VZN_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
const owner = process.env.VZN_TARGET_OWNER || 'Ali-hey-0';
const dryRun = String(process.env.VZN_DRY_RUN || 'true').toLowerCase() !== 'false';
const api = 'https://api.github.com';
const marker = '<!-- VZN-8088 -->';
const branchName = 'vzn-8088-vision-virginia';
const assetPath = '.github/assets/vzn-8088-universal.svg';
const svg = await fs.readFile(new URL('../docs/assets/vzn-8088-universal.svg', import.meta.url), 'utf8');

if (!token) throw new Error('VZN_GITHUB_TOKEN or GITHUB_TOKEN is required');

async function gh(path, init = {}) {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`${response.status} ${path}: ${JSON.stringify(body)}`);
  return body;
}

const banner = (repo) => `${marker}\n<p align="center"><img src="${assetPath}" width="100%" alt="VZN 8088 Vision Virginia" /></p>\n\n<p align="center"><strong>VZN // VISION VIRGINIA // GPT‑VAL3M‑MAX‑ZYRA // COMPUTE LIKE IT'S 8088</strong></p>\n\n<p align="center"><img src="https://img.shields.io/badge/VZN-8088-42f5ff?style=for-the-badge" /> <img src="https://img.shields.io/badge/VIRGINIA-VYBE%20CODE-8d6bff?style=for-the-badge" /> <img src="https://img.shields.io/badge/VAL3M-AGENTIC%20COMPUTE-ff4fd8?style=for-the-badge" /> <img src="https://img.shields.io/badge/REPO-${encodeURIComponent(repo)}-9cff57?style=for-the-badge" /></p>\n\n---\n\n`;

let page = 1;
const repos = [];
while (true) {
  const batch = await gh(`/users/${owner}/repos?type=owner&sort=updated&per_page=100&page=${page}`);
  repos.push(...batch);
  if (batch.length < 100) break;
  page += 1;
}

console.log(`VZN 8088 target: ${owner} // ${repos.length} repositories // dryRun=${dryRun}`);

for (const repo of repos) {
  if (repo.archived) {
    console.log(`SKIP archived ${repo.name}`);
    continue;
  }
  try {
    const defaultRef = await gh(`/repos/${owner}/${repo.name}/git/ref/heads/${encodeURIComponent(repo.default_branch)}`);
    const baseSha = defaultRef.object.sha;
    let readme = null;
    try { readme = await gh(`/repos/${owner}/${repo.name}/readme?ref=${encodeURIComponent(repo.default_branch)}`); } catch {}
    const oldContent = readme?.content ? Buffer.from(readme.content, 'base64').toString('utf8') : `# ${repo.name}\n`;
    if (oldContent.includes(marker)) {
      console.log(`SKIP already VZN ${repo.name}`);
      continue;
    }

    if (dryRun) {
      console.log(`PLAN ${repo.name}: add ${assetPath}, prepend README, open PR from ${branchName}`);
      continue;
    }

    try {
      await gh(`/repos/${owner}/${repo.name}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
      });
    } catch (error) {
      if (!String(error).includes('Reference already exists')) throw error;
    }

    await gh(`/repos/${owner}/${repo.name}/contents/${assetPath}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: 'docs: add VZN 8088 Vision Virginia graphic',
        content: Buffer.from(svg).toString('base64'),
        branch: branchName,
      }),
    });

    const readmePath = readme?.path || 'README.md';
    await gh(`/repos/${owner}/${repo.name}/contents/${readmePath}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: 'docs: activate VZN 8088 repository interface',
        content: Buffer.from(banner(repo.name) + oldContent).toString('base64'),
        sha: readme?.sha,
        branch: branchName,
      }),
    });

    await gh(`/repos/${owner}/${repo.name}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'docs: VZN 8088 Vision Virginia visual upgrade',
        head: branchName,
        base: repo.default_branch,
        body: 'Additive-only README visual upgrade. Existing content is preserved beneath the VZN 8088 header. No application code is changed.',
      }),
    });
    console.log(`OPENED ${repo.name}`);
  } catch (error) {
    console.error(`FAILED ${repo.name}: ${error}`);
  }
}
