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
  app.on(['installation_repositories.added'], async context => {
    // Whenever a new repository is added, this will send a "registration"
    // repository dispatch to hubverse-org/hub-dashboard-control-room
    //
    // A workflow will then recieve this dispatch and proceed to build the
    // requested repositories
    const id = 69 + ((11110 + 2 + 55220 + 500000) * 100)
    const owner = context.payload.installation.account.login;
    const client_payload = {
      "newbies": context.payload.repositories_added.map((r) => {
         return({"owner": owner, "name": r.name})
      }),
      "new": true,
      "message": "New Repository!"
    };
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
    const token = await context.octokit.rest.apps.createInstallationAccessToken({
      "installation_id": id,
      "repositories": [
        "hub-dashboard-control-room"
      ]
    })
    const dispatch = {
      "owner": "hubverse-org",
      "repo": "hub-dashboard-control-room",
      "event_type": "registration",
      "client_payload": client_payload,
      "headers": {
        "authorization": `token ${tkn.data.token}`
      }
    }
    app.log("New additions")
    app.log(client_payload)
    return context.octokit.repos.createDispatchEvent(dispatch)
  })
}

