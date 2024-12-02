const { createAppAuth } = require("@octokit/auth-app");
const { Octokit } = require("@octokit/core");

async function send_dispatch(client_payload, action) {
  // 2024-11-26
  // So the only way that I can get this to work is if I call the API using a
  // PAT. I used https://github.com/probot/probot/discussions/1316 as a
  // jumping off point for figuring out how to debug this. While I do believe
  // I should be doing is using the app to generate a token, but at the moment
  // this will work (for now)
  const installationOctokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const dispatch = {
    owner: "hubverse-org",
    repo: "hub-dashboard-control-room",
    event_type: action,
    client_payload: client_payload,
  };
  const options = installationOctokit.request.endpoint.merge(
    "POST /repos/:owner/:repo/dispatches",
    dispatch
  );

  await installationOctokit.request(options);
}

module.exports = (app) => {
  app.on(["installation_repositories.removed"], async (context) => {
    // Whenever a new repository is added, this will send a "registration"
    // repository dispatch to hubverse-org/hub-dashboard-control-room
    //
    // A workflow will then recieve this dispatch and proceed to build the
    // requested repositories
    const client_payload = {
      newbies: context.payload.repositories_removed.map((r) => r.full_name),
      new: true,
      message: "Bad Repository!",
    };
    app.log(`A new repository was removed ${client_payload.newbies}`);
  });
  app.on(["issue_comment.created", "issue_comment.edited"], async (context) => {
    const is_bot = context.payload.comment.user.login == "hubdashboard[bot]"
    if (is_bot) {
      app.log("I commented! I'm helping!")
      return(null)
    }
    const allowed_to_comment =
      "COLLABORATOR, CONTRIBUTOR, MEMBER, OWNER".includes(
        context.payload.comment.author_association
      );
    if (!allowed_to_comment) {
      return 200;
    }
    const the_floor = context.payload.comment.body;
    if (!the_floor.includes("/hub build")) {
      return 200;
    }

    const action = the_floor
      .split("/hub ")[1]
      .split("\n")[0]
      .trim()
      .toLowerCase();
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;
    const client_payload = {
      newbies: [{ owner: owner, name: repo }],
      new: true,
      regenerate: false,
      message: "Comment",
    };
    var body;
    switch (action) {
      case "build all":
        body = "The site and data should be updated in a few minutes.";
        break;
      case "build site":
        body = "The site should be updated in a minute or two.";
        break;
      case "build forecasts":
      case "build data":
        body =
          "The data should be updated in a few minutes (actual duration depends on the size of the hub)";
        break;
      case "rebuild forecasts":
      case "rebuild data":
        body =
          "The data should be updated in a few minutes (actual duration depends on the size of the hub)";
        client_payload.regenerate = true
        break;
      case "build targets":
        body = "The target data should be updated in a minute or two";
        break;
      default:
        body = `
I could not understand the command ${action}.

You can use one of the following commands for your site:

- \`site\` (rebuilds the website only)
- \`data\` (updates the underlying data for the predtimechart vis)
- \`targets\` (updates the targets data)
- \`forecasts\` (updates the forecasts data)
- \`all\` (rebuilds everything)

e.g. running \`/hub build site\` will build your site.

> [!NOTE]
> Only the newest forecast data are rebuilt. If you need to rebuild all of your
> forecast data (e.g. model data from a previous round was updated), you can 
> use the **\`rebuild\`** keyword (e.g. \`hub rebuild data\` or 
> \`hub rebuild forecasts\`)`;
    }
    const params = context.issue({ body: body });
    if (!body.includes("could not understand")) {
      const result = await send_dispatch(client_payload, action);
      app.log(
        `Ran hub build ${action} for ${client_payload.newbies.owner}/${client_payload.newbies.name}`
      );
    }
    // Post a comment on the issue
    return context.octokit.issues.createComment(params);
  });
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
  app.on(["push"], async (context) => {
    const not_main = context.payload.ref != "refs/heads/main";
    if (not_main) {
      app.log("push event not on main---skipping");
      return null;
    }

    // Whenever a new repository is added, this will send a "registration"
    // repository dispatch to hubverse-org/hub-dashboard-control-room
    //
    // A workflow will then recieve this dispatch and proceed to build the
    // requested repositories
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;
    const client_payload = {
      newbies: [{ owner: owner, name: repo }],
      new: true,
      message: "Update",
    };
    const result = await send_dispatch(client_payload, "site");
    app.log(
      `Rebuilt site for ${client_payload.newbies.owner}/${client_payload.newbies.name}`
    );
    app.log(client_payload);
    return result;
  });
  app.on(["installation_repositories.added"], async (context) => {
    // Whenever a new repository is added, this will send a "registration"
    // repository dispatch to hubverse-org/hub-dashboard-control-room
    //
    // A workflow will then recieve this dispatch and proceed to build the
    // requested repositories
    const owner = context.payload.installation.account.login;
    const client_payload = {
      newbies: context.payload.repositories_added.map((r) => {
        return { owner: owner, name: r.name };
      }),
      new: true,
      message: "New Repository!",
    };

    const result = await send_dispatch(client_payload, "registration");
    app.log(
      `A new repository was added ${client_payload.newbies.owner}/${client_payload.newbies.name}`
    );
    app.log("New additions");
    app.log(client_payload);
    return result;
  });
};


