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
    const owner = context.payload.installation.account.login;
    const client_payload = {
      "newbies": context.payload.repositories_added.map((r) => {
         return({"owner": owner, "name": r.name})
      }),
      "new": true,
      "message": "New Repository!"
    };
    // TODO: the token generated from this app is _specific to the repo that
    // triggered the webhook_. This means that I ne3ed to store the installation
    // ID and/or the access token as a secret and somehow use that in place of
    // the existing token. 
    const dispatch = {
      "owner": "hubverse-org",
      "repo": "hub-dashboard-control-room",
      "event_type": "registration",
      "client_payload": client_payload
    }
    app.log(`A new repository was added ${client_payload.newbies}`);
    return context.octokit.repos.createDispatchEvent(dispatch);
  })
}

