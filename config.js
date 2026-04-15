const GITHUB_TOKEN = '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';

window.addEventListener('DOMContentLoaded', () => {
  if (GITHUB_TOKEN && GITHUB_TOKEN !== 'ghp_YOUR_TOKEN_HERE') {
    localStorage.setItem('pc_gh_token', GITHUB_TOKEN);
  }
});
