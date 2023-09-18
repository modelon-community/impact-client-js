// This script examplifies how to get model description units and variables.
//
// Make sure to have installed dependencies and have the required environment variables
// available, as described in the Quick start example:
//
// https://github.com/modelon-community/impact-client-js#quick-start
//
// Then run the example with: node modelDescription.mjs

import {
    Analysis,
    Client,
    ExperimentDefinition,
    Model,
} from '@modelon/impact-client-js'
import dotenv from 'dotenv'

// Load the .env file variables, install with: npm install dotenv
dotenv.config({ path: '../.env' })

const client = Client.fromImpactApiKey({
    impactApiKey: process.env.MODELON_IMPACT_CLIENT_API_KEY,
    jupyterHubToken: process.env.JUPYTERHUB_API_TOKEN,
    serverAddress: process.env.MODELON_IMPACT_SERVER,
})

const WorkspaceName = 'test'

const workspace = await client.createWorkspace({
    name: WorkspaceName,
})

const experimentDefinition = ExperimentDefinition.from({
    analysis: Analysis.from(Analysis.DefaultAnalysis),
    model: Model.from({ className: 'Modelica.Blocks.Examples.PID_Controller' }),
})

const experiment = await workspace.executeExperimentUntilDone({
    caseIds: ['case_1'],
    experimentDefinition,
    timeoutMs: 10_000,
})

const cases = await experiment.getCases()
const modelExecutable = await cases[0].getModelExecutable()
const modelDescription = await modelExecutable.getModelDescription()

const variables = modelDescription.getVariables()
console.log(variables[0])

const units = modelDescription.getUnits()
console.log(units[0])

await client.deleteWorkspace(WorkspaceName)
