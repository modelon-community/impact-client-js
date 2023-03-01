# impact-client-js

impact-client-js is a library created to simplify interaction with Modelon Impact.

## Installation

`npm install @modelon/impact-client-js@alpha`

### Configuration

Usage and also execution of integration tests requires some environment variables to communicate with a running Modelon Impact installation.
Put the following information in an `.env` file in your project root folder:

```bash
IMPACT_API_KEY=<your impact api key>
JH_TOKEN=<your JH token>
JHMI_SERVER=<jhmi server address>
```

## Example usage

```JavaScript
import * as dotenv from "dotenv";
import { Client, ExperimentDefinition } from "@modelon/impact-client-js";

// Load the .env file variables, install with: npm install dotenv
dotenv.config();

await (async () => {
  const client = Client.fromImpactApiKey({
    impactApiKey: process.env.IMPACT_API_KEY,
    jupyterHubToken: process.env.JH_TOKEN,
    serverAddress: process.env.JHMI_SERVER,
  });

  const WorkspaceName = "setup-and-exec";

  const workspace = await client.createWorkspace({
    name: WorkspaceName,
  });

  const experimentDefinition = ExperimentDefinition.from({
    customFunction: "dynamic",
    modelName: "Modelica.Blocks.Examples.PID_Controller",
    parameters: {
      start_time: 0,
      final_time: 1,
    },
    extensions: [
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
    ],
  });

  const experiment = await workspace.executeExperimentSync({
    caseIds: ["case_1", "case_2"],
    experimentDefinition,
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

## Tests

With the repo cloned and after running `npm install` tests can be executed with one of:

```
npm run test
npm run unit-test
npm run integration-test
```

## Schema

The API schema is based on the build output from the impact-openapi beta branch which has then been passed through openapi-typescript.
