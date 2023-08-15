// This script examplifies how to use the Range operator to create
// a multi-execution experiment.
//
// Make sure to have installed dependencies and have the required environment variables
// available, as described in the Quick start example:
// https://github.com/modelon-community/impact-client-js#quick-start

const dotenv = require('dotenv')
const {
    Analysis,
    Client,
    ExperimentDefinition,
    Model,
    Range,
} = require('@modelon/impact-client-js')

// Load the .env file variables, install with: npm install dotenv
dotenv.config()
;(async () => {
    const client = Client.fromImpactApiKey({
        impactApiKey: process.env.MODELON_IMPACT_CLIENT_API_KEY,
        jupyterHubToken: process.env.JUPYTERHUB_API_TOKEN,
        serverAddress: process.env.MODELON_IMPACT_SERVER,
    })

    const WorkspaceName = 'test'
    const workspace = await client.createWorkspace({
        name: WorkspaceName,
    })

    const analysis = Analysis.from({
        type: 'dynamic',
    })
    const model = Model.from({
        className: 'Modelica.Blocks.Examples.PID_Controller',
    })

    const experimentDefinition = ExperimentDefinition.from({
        analysis,
        model,
        modifiers: {
            variables: { 'PI.k': new Range(10, 100, 3).toString() },
        },
    })

    const experiment = await workspace.executeExperimentUntilDone({
        experimentDefinition,
        timeoutMs: 60 * 1000,
    })

    const cases = await experiment.getCases()

    for (const simCase of cases) {
        const timeItems = await simCase.getTrajectories(['time'])
        const timeEndValue = timeItems[0].trajectory.pop()
        const inertiaItems = await simCase.getTrajectories(['inertia1.phi'])
        const inertiaEndValue = inertiaItems[0].trajectory.pop()
        const caseInput = await simCase.getInput()
        console.log(
            `End value for case with PI.k: ${caseInput.parametrization['PI.k']} at time ${timeEndValue}: ${inertiaEndValue}`
        )
    }

    await client.deleteWorkspace(WorkspaceName)
})()
