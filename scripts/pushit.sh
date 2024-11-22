#!/usr/bin/env bash

branch="${1:-'gh-pages'}"
repo="${2:-missing}"
slug="${3:-missing}"
email="${4:-missing}"
token="${5:-missing}"
commitargs="${5:-}"

if [[ "$branch" == "gh-pages" ]];then
  dir="pages"
  msg="deploy"
else
  dir="data"
  msg="update data"
fi

cd "$dir" || (echo "Directory '$dir' not found" && exit 1)
git config --global user.name "${slug}[bot]"
git config --global user.email "${email}"
git remote set-url origin "https://${slug}[bot]:${token}@github.com/${repo}.git"
ls
git status
if [[ -n $(grep 'amend' <<< "${commitargs}") ]]; then
  # remove old data/site contents
  git rm -r "*" || echo "nothing to do"
fi
if [[ "$branch" == "gh-pages" ]]; then
  cp -R ../_site/* .
  touch .nojekyll
else 
  cp -R ../forecasts .
  cp -R ../targets .
  cp ../predtimechart-options.json .
fi
git add . && git commit "${commitargs}" -m "$msg"
git status
git push --force
cd 
