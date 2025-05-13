#!/usr/bin/env bash
# Check if an orphan branch exists. If it does not exist, create it and push it
# to the repository. This assumes you have an internet connection and a 
# GitHub personal access token with `repo: write` permissions to the repository
#
# Required Software:
#
#  - git
#  - gh (cli.github.com)
#
# Usage:
#   check-branch.sh <branch> <repo> <slug> <email> <token>
# 
# Example, checking for the gh-pages branch of the hubverse-org/hubverse-site repository:
#   check-branch.sh \
#     gh-pages \
#     hubverse-org/hubverse-site \
#     github-actions[bot] \
#     41898282+github-actions[bot]@users.noreply.github.com \
#     $GH_TOKEN
branch="${1:-'gh-pages'}"
repo="${2:-missing}"
slug="${3:-missing}"
email="${4:-missing}"
token="${5:-missing}"


exists=$(gh api -X GET "repos/${repo}/branches" --jq ".[].name | select(. == \"${branch}\")")
if [[ "$exists" != "${branch}" ]]; then
  # if the branch does not exist, then we can create an orphan branch by
  #
  # 1. initializing a git repository in an empty directory --------------
  tmp=$(mktemp --directory)
  cd "$tmp"
  git config --global user.name "${slug}"
  git config --global user.email "${email}"
  git init

  # 2. checking out the branch we want to create ------------------------
  git switch -c "${branch}"

  # 3. configuring our remote repository --------------------------------
  git remote add origin https://${slug}:${token}@github.com/${repo}.git

  # 4. adding an empty commit and pushing the branch --------------------
  git commit --allow-empty -m "initial ${branch} commit"
  git push --set-upstream origin "${branch}"
  cd
fi
