#!/usr/bin/env bash

branch="${1:-'gh-pages'}"
repo="${2:-missing}"
slug="${3:-missing}"
email="${4:-missing}"
token="${5:-missing}"


exists=$(gh api -X GET "repos/${repo}/branches" --jq '.[].name | select(. == "${branch}")')
if [[ "$exists" != "${branch}" ]]; then
  tmp=$(mktemp --directory)
  cd "$tmp"
  git config --global user.name "${slug}"
  git config --global user.email "${email}"
  git init
  git switch -c "${branch}"
  git remote add origin https://${slug}:${token}@github.com/${repo}.git
  git commit --allow-empty -m 'initial ${branch} commit'
  git push --set-upstream origin "${branch}"
  cd
fi
