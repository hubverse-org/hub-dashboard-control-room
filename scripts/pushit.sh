#!/usr/bin/env bash
# Copy outputs of a process into a subdirectory representing a git branch and
# push that branch up
#
# USAGE
#
#   bash pushit.sh <branch> <repo> <slug> <email> <token>
#
# ARGUMENTS
#
#   branch  the branch the output directory represents (defaults to `gh-pages`)
#   repo    the repository to push to
#   slug    slug of the pusher (e.g. hubdashboard[bot] or zkamvar)
#   email   email of the pusher (e.g. 186236658+hubdashboard[bot]@users.noreply.github.com)
#   token   GitHub Token used for authentication, must have `contents: write scope`
#             associated with the <email>
#
# SETUP
#
#   Before this script is run, you must have the following in place:
#
#   1. a local clone of <repo>@<branch> in a directory called either "pages"
#      (for branch=gh-pages) or "data" for others
#   2. output of a previous build process _in the current working directory_.
#
branch="${1:-'gh-pages'}"
repo="${2:-missing}"
slug="${3:-missing}"
email="${4:-missing}"
token="${5:-missing}"

# There are currently three branches that this script knows what to do with.
#
# There are four variables that we set based on the branches:
#
#  - dir      the directory of the cloned branch
#  - msg      the commit message
#  - amend    a boolean that indicates if the commit should be amended (for
#               sites) or not (for data)
#  - to_copy  an array of items to copy from the cwd into $dir
case "$branch" in
  "gh-pages")
    # The gh-pages branch hosts the website and will always be overwritten
    msg="deploy"
    amend=true
    to_copy=("_site/*" ".nojekyll")
    touch .nojekyll
    ;;
  "ptc/data")
    # ptc/data hosts the forecast data for the predtimechart visualization
    msg="update data"
    amend=false
    to_copy=("forecasts" "targets" "predtimechart-options.json")
    ;;
  "predevals/data")
    # predevals/data hosts the scores data for the predevals visualization
    msg="update data"
    amend=false
    to_copy=("scores" "predevals-options.json")
    ;;
  "*")
    echo "Unrecognized branch name: $branch"
    exit 1
    ;;
esac

dir=data
# STEP 1: enter directory and set up git credentials
cd "$dir" || (echo "Directory '$dir' not found" && exit 1)
git config --global user.name "${slug}"
git config --global user.email "${email}"
git remote set-url origin "https://${slug}:${token}@github.com/${repo}.git"
git status

if [[ "${amend}" == "true" ]]; then
  # for gh-pages, remove old data/site contents
  git rm -r "*" || echo "nothing to do"
fi

# STEP 2: recursively copy all assets to $dir
for file in "${to_copy[@]}"; do
  # this is necessary for getting around the problem that you cannot
  # pass a variable with a glob to `cp`
  eval "cp -R ../$file ."
done
git status

# STEP 3: add and commit
git add .
if [[ "${amend}" == "true" ]]; then
  git commit --amend -m "$msg"
else
  git commit -m "$msg"
fi

# STEP 4: push the changes
git status
git push --force-with-lease
cd 
