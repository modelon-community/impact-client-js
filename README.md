# impact-client-js

This library was created to simplify interaction with the Modelon Impact simulation platform. Currently it is best suited for smaller web applications and
examples to demonstrate Modelon Impact features. For more advanced or larger applications interacting with Modelon Impact it is better to use the REST API directly
since impact-client-js only exposes a small subset of the features available in the REST API.

For non-browser scripting purposes the best alternative is to use [impact-client-python](https://github.com/modelon-community/impact-client-python) if Python is an option.

## Installation

`npm install @modelon/impact-client-js`

### Authentication

If your app is running inside the Modelon Impact JupyterHub environment you only need to provide an Impact API key to authenticate. If your app runs outside the JupyterHub environment it will also need to authenticate towards JupyterHub using a token.

#### Obtaining and setting the Impact API key

An API key is needed for authentication in order to utilize the client with the Modelon Impact server. To generate the key, go to the Server Management on Modelon Impact. Click on the IMPACT API KEY tab drop-down and click Regenerate and replace key to generate a new one.

Remember that this is the only time you will see the secret. Make sure to store it safely.

Copy the key and keep it safe. If the key is lost or compromised, you can generate a new one by clicking the Regenerate and replace key button. This will delete the old key, so any application that uses it must have their keys updated to work. The API key is personal and each user may have one single key at a time, so do not share one key between several persons.

#### Obtaining and setting the JupyterHub token

Note that this is only required if you are running your app outside the Modelon Impact JupyterHub environment.

The token can be acquired using the token page at https://impact.modelon.cloud/hub/token or the corresponding address for on-premise installations.

You can get a secret token by choosing the “Request new API token” option. These are fully functional access tokens for the JupyterHub API. Everything that can be done with JupyterHub can be done with these tokens.

Remember that this is the only time you will see the secret. Make sure to store it safely.

If the token is lost, you can always generate a new one by clicking the “Request new API token” button. While initializing the client, you will be asked to enter the JupyterHub API token in a prompt.

## Quick start

This quick start gives an example of how to setup a very basic node.js project that leverages impact-client-js. The more likely usage
is perhaps to use impact-client-js in a browser environment, an example of this is in the works but the basics are similar to how it
is done in node.js.

Create a new empty node.js project

`npm init -y`

Install impact-client-js

`npm install @modelon-community/impact-client-js`

Install dotenv to manage authentication credentials:

`npm install dotenv`

Create a `.env` file in the root of your project with the following content:

```bash
MODELON_IMPACT_CLIENT_API_KEY=<your impact API key>
JUPYTERHUB_API_TOKEN=<your JupyterHub API token>
MODELON_IMPACT_SERVER=<Modelon Impact server address>
```

See [Authentication](#Authentication) for info on how to obtain the credentials.

Create a file `index.js` and run it via `node index.js`.

```JavaScript
const dotenv = require("dotenv");
const {
  Analysis,
  Client,
  ExperimentDefinition,
  Model,
} = require("@modelon/impact-client-js");

// Load the .env file variables, install with: npm install dotenv
dotenv.config();

(async () => {
  const client = Client.fromImpactApiKey({
    impactApiKey: process.env.MODELON_IMPACT_CLIENT_API_KEY,
    jupyterHubToken: process.env.JUPYTERHUB_API_TOKEN,
    serverAddress: process.env.MODELON_IMPACT_SERVER,
  });

  const WorkspaceName = "test";

  const workspace = await client.createWorkspace({
    name: WorkspaceName,
  });

  const extensions = [
    {
      modifiers: {
        variables: {
          "inertia1.J": 1,
          "inertia2.J": 2,
        },
      },
    },
    {
      modifiers: {
        variables: {
          "inertia1.J": 2,
          "inertia2.J": 4,
        },
      },
    },
  ];

  const customFunction = "dynamic";
  const analysis = Analysis.from({
    type: customFunction,
  });
  const model = Model.from({
    className: "Modelica.Blocks.Examples.PID_Controller",
  });
  const experimentDefinition = ExperimentDefinition.from({
    analysis,
    extensions,
    model,
  });
  const caseIds = experimentDefinition
    .getCaseDefinitions()
    .map((def) => def.caseId);

  const experiment = await workspace.executeExperimentUntilDone({
    caseIds,
    experimentDefinition,
    timeoutMs: 60 * 1000,
  });

  const trajectories = await experiment.getTrajectories([
    "inertia1.w",
    "inertia1.a",
  ]);

  // Print a data point from the experiment result
  console.log(Math.max(...trajectories[0].items[0].trajectory));

  await client.deleteWorkspace(WorkspaceName);
})();
```

## Development

Clone this repository then install the impact-client-js dependencies:

`npm install`

The integration tests manage credentials using [dotenv](https://github.com/motdotla/dotenv). Create a `.env` file in the root of the repository by copying .env.example and filling out the values. See [Authentication](#Authentication) to see how to obtain the required credentials.

### Tests

With the repo cloned and after running `npm install` tests can be executed with one of:

```
npm run test
npm run unit-test
npm run integration-test
```

### Schema

The impact-client-js API schema is based on the Modelon Impact openapi REST specification, converted to typescript type using [openapi-typescript](https://github.com/drwpow/openapi-typescript).
