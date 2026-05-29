#!/usr/bin/env bash
# ============================================================
# EduTrack — GitHub Branch Protection Setup
# ============================================================
# Prerequisites:
#   1. Install the GitHub CLI: https://cli.github.com
#   2. Authenticate:  gh auth login
#   3. Run this script from the repo root:
#        bash scripts/setup-github-branch-protection.sh
# ============================================================

set -e

REPO="Sir-Adrien-Claudington/edutrack"
BRANCH="master"

echo "Applying branch protection rules to $REPO ($BRANCH)..."

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$REPO/branches/$BRANCH/protection" \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["analyze", "dependency-review"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false
}
EOF

echo "Branch protection applied successfully."
echo ""
echo "Rules enforced on '$BRANCH':"
echo "  - PRs require 1 approving review"
echo "  - Status checks must pass: analyze (CodeQL), dependency-review"
echo "  - Branch must be up to date before merging"
echo "  - Force pushes blocked"
echo "  - Branch deletion blocked"
echo "  - Rules apply to admins too"
