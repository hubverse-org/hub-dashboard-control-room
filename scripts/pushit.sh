#!/usr/bin/env bash

branch="${1:-'gh-pages'}"
repo="${2:-missing}"
slug="${3:-missing}"
email="${4:-missing}"
token="${5:-missing}"


case "$branch" in
  "gh-pages")
    dir="pages"
    msg="deploy"
    amend=true
    touch .nojekyll
    to_copy=("_site/*" ".nojekyll")
    ;;
  "ptc/data")
    dir="data"
    msg="update data"
    amend=false
    to_copy=("forecasts" "targets" "predtimechart-options.json")
    ;;
  "predevals/data")
    dir="data"
    msg="update data"
    amend=false
    to_copy=("scores" "predevals-options.json")
    ;;
  "*")
    echo "oops"
    ;;
esac


ls
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

for file in "${to_copy[@]}"; do
  cp -R "../$file" .
done

git add .
if [[ "${amend}" == "true" ]]; then
git commit --amend -m "$msg"
else
git commit -m "$msg"
fi
git status
git push --force-with-lease
cd 
