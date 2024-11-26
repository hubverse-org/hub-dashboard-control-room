const { createAppAuth } = require("@octokit/auth-app");
const { Octokit } = require("@octokit/core");

module.exports = (app) => {
  app.on(['installation_repositories.removed'], async context => {
    // Whenever a new repository is added, this will send a "registration"
    // repository dispatch to hubverse-org/hub-dashboard-control-room
    //
    // A workflow will then recieve this dispatch and proceed to build the
    // requested repositories
    const client_payload = {
      "newbies": context.payload.repositories_removed.map((r) => r.full_name),
      "new": true,
      "message": "Bad Repository!"
    };
    app.log(`A new repository was removed ${client_payload.newbies}`);
  })
  // 2024-11-14
  // I have determined that the token created for any given webhook event is
  // specific to the repository or org that initiates the webhook. 
  // 
  // Because I want to trigger a workflow on one specific repository, I need
  // to generate a token specifically for that installation on that
  // repository. I grabbed the installation ID from the app log and
  // restricted it to the one repository I wanted to trigger.
  //
  // Unfortunately, I continue to get 402 error codes. 
  app.on(['installation_repositories.added'], async context => {
    // Whenever a new repository is added, this will send a "registration"
    // repository dispatch to hubverse-org/hub-dashboard-control-room
    //
    // A workflow will then recieve this dispatch and proceed to build the
    // requested repositories
    const owner = context.payload.installation.account.login;
    const client_payload = {
      "newbies": context.payload.repositories_added.map((r) => {
        return({"owner": owner, "name": r.name})
      }),
      "new": true,
      "message": "New Repository!"
    };

    // 2024-11-26
    // So the only way that I can get this to work is if I call the API using a
    // PAT. I used https://github.com/probot/probot/discussions/1316 as a
    // jumping off point for figuring out how to debug this. While I do believe
    // I should be doing is using the app to generate a token, but at the moment
    // this will work (for now)
    const installationOctokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });

    const dispatch = {
      "owner": "hubverse-org",
      "repo": "hub-dashboard-control-room",
      "event_type": "registration",
      "client_payload": client_payload, 
    }
    const options = installationOctokit.request.endpoint.merge(
      "POST /repos/:owner/:repo/dispatches",
      dispatch
    );
    console.log(options);

    await installationOctokit.request(options);

    app.log(`A new repository was added ${client_payload.newbies.owner}/${client_payload.newbies.name}`);
    app.log("New additions")
    app.log(client_payload)
  })
}

