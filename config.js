const GITHUB_TOKEN = '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';

window.addEventListener('DOMContentLoaded', () => {
  if (GITHUB_TOKEN && GITHUB_TOKEN !== 'ghp_YOUR_TOKEN_HERE') {
    localStorage.setItem('pc_gh_token', GITHUB_TOKEN);
  }
});
