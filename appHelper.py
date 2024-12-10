#!/usr/bin/env python

import os
import json
import yaml
import string
import random
from datetime import date, timedelta
# https://pygithub.readthedocs.io/
from github import Auth
from github import Github
from github import GithubIntegration
from github import GithubException
from github import UnknownObjectException

def check_credentials():
    pemf = os.environ.get("PRIVATE_KEY")
    id = os.environ.get("APP_ID")
    valid = pemf is not None and id is not None
    # TODO: add informative message here
    return valid

def get_hub(repo):
    try:
        cfg = repo.get_contents('site-config.yml').decoded_content
    except UnknownObjectException:
        print(f"Skipping '{repo.full_name}', which does not appear to be a dashboard repository.")
        return None
    return os.path.normpath(yaml.load(cfg, yaml.Loader).get("hub"))

def api_access(token = None):
    if token is None:
        token = os.environ.get("GITHUB_TOKEN")
    auth = Auth.Token(token)
    return Github(auth = auth)

def get_tasks(hub, g):
    if hub is None:
        return None
    print(f"Fetching tasks for {hub}")
    repo = g.get_repo(hub)
    try:
        tasks = repo.get_contents("hub-config/tasks.json").decoded_content
    except UnknownObjectException:
        print(f"Could not find any tasks in {hub}.")
        print("Exiting.")
        return None
    return(json.loads(tasks))

def get_submissions_range(tasks):
    subs = tasks.get("rounds")[0].get("submissions_due")
    relative = subs.get("relative_to")
    start = subs.get("start")
    end = subs.get("end")
    if relative is None:
        start = date.fromisoformat(start)
        end = date.fromisoformat(end) - start
        return [start + x for x in range(end.days)]

    dates = tasks.get("rounds")[0].get("model_tasks")[0].get("task_ids").get(relative)

    # when there is one required submission date
    if dates["required"] is not None and len(dates["required"]) == 1:
        the_date = date.fromisoformat(dates["required"][0])
    else:
        today = date.today()
        the_date = get_closest_date(dates["optional"], today)

    # when it gets to here, start and end are relative
    return [the_date + timedelta(days = x) for x in range(start, end + 1)]

def get_closest_date(dates, today):
    the_date = None
    last_date = None
    for maybe in dates:
        if date.fromisoformat(maybe) > today:
            the_date = last_date
            break
        last_date = maybe
    return date.fromisoformat(the_date)

def round_closed_yesterday(tasks):
    if tasks is None:
        return False
    sub_range = get_submissions_range(tasks)
    date.today() == max(sub_range) + timedelta(days = 1)

def include_if_round_is_closed(repo, g):
    print(f"Processing {repo.full_name}")
    hub = get_hub(repo)
    tasks = get_tasks(hub, g)
    # if the round closed yesterday, then we can build the dashboard
    if round_closed_yesterday(tasks):
        return {"owner": repo.owner.login, "name": repo.name}
    else:
        return None





# generate a random ID to assing the variable
def id_generator(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for _ in range(size))

# the private key here is either a .pem file or it's an evvar that contains the
# contents of the .pem file. 
def read_pem():
    pemf = os.environ["PRIVATE_KEY"]
    if os.path.isfile(pemf):
        with open(pemf, 'rb') as f:
            cert = f.read()
    else:
        cert = pemf
    return cert

def write_string(key, value):
    # assign them to the GitHub output (which is a file whose path is assigned
    # to the GITHUB_OUTPUT variable) 
    ghoutput = os.environ.get("GITHUB_OUTPUT")
    if ghoutput is None:
        throwException("oops")
    if os.path.isfile(ghoutput):
        with open(ghoutput, 'a') as f:
            f.write(f'{key}={value}\n')
            f.close()

def write_json(key, value):
    # assign them to the GitHub output (which is a file whose path is assigned
    # to the GITHUB_OUTPUT variable) 
    ghoutput = os.environ.get("GITHUB_OUTPUT")
    if ghoutput is None:
        throwException("oops")
    rid = id_generator()
    if os.path.isfile(ghoutput):
        with open(ghoutput, 'a') as f:
            f.write(f'{key}<<{rid}\n{json.dumps(value)}\n{rid}\n')
            f.close()

def get_app():
    # Auth dance
    cert = read_pem()
    auth = Auth.AppAuth(os.environ["APP_ID"], str(cert))
    gi = GithubIntegration(auth = auth)
    return {"integration": gi, "app": gi.get_app(), "inst": gi.get_installations()}

def get_slug_id():
    ghapp = get_app()
    installation = ghapp["inst"][0]
    gh = installation.get_github_for_installation()
    app = ghapp["app"]
    app_usr = gh.get_user(app.slug+"[bot]")
    email = f'{app_usr.id}+{app_usr.login}@users.noreply.github.com'
    write_string("slug", app.slug)
    write_string("email", email)
    write_string("id", app_usr.id)


def list_repositories():
    '''
    Create an output item called "repos" that contains a JSON list of
    objects with the elements "owner" and "name" describing the github account
    owner/org and the name of the repository, respectively.

    If the enviornment var `NEW_REPOS` is not missing or "null", then this is
    used as the input, otherwise, the entire list of installations is returned.
    '''
    newbies = os.environ.get("NEW_REPOS")
    baddies = set(["", '""', '"null"', "null", "false", " "])
    if newbies is not None and newbies not in baddies:
        print("loading repositories")
        repos = json.loads(newbies)
    else:
        print("fetching repositories")
        ghapp = get_app()
        repos = []
        g = api_access()
        for installation in ghapp["inst"]:
            # get the full names for the repositories
            repos += [include_if_round_is_closed(x, g) for x in installation.get_repos()]
    invalid = [
        {"owner":"hubverse-org", "name":"hub-dashboard-control-room"},
        {"owner":"zkamvar", "name":"hub-dashboard-control-room"}
    ]
    for i in invalid:
        try:
            repos.remove(i)
        except ValueError:
            pass

    write_json("repos", [x if x in repos if x is not None])

def get_token():
    ghapp = get_app()
    installation = ghapp["inst"][0]
    token = ghapp.get_access_token(installation.id)
    write_string("token", token.token)

