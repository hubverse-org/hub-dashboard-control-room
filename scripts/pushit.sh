#!/usr/bin/env bash

branch="${1:-'gh-pages'}"
repo="${2:-missing}"
slug="${3:-missing}"
email="${4:-missing}"
token="${5:-missing}"

if [[ "$branch" == "gh-pages" ]];then
  dir="pages"
  msg="deploy"
  amend=true
else
  dir="data"
  msg="update data"
  amend=false
fi

cd "$dir" || (echo "Directory '$dir' not found" && exit 1)
git config --global user.name "${slug}"
git config --global user.email "${email}"
git remote set-url origin "https://${slug}:${token}@github.com/${repo}.git"
ls
git status
if [[ "${amend}" == "true" ]]; then
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
git add .
if [[ "${amend}" == "true" ]]; then
git commit --amend -m "$msg"
else
git commit -m "$msg"
fi
git status
git push --force-with-lease
cd 
