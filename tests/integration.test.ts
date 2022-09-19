import * as dotenv from 'dotenv'
import { Client } from '..'
import { ModelicaExperimentDefinition } from '../src/ModelicaExperimentDefinition'
import { GetWorkspacesResponse } from '../src/types'

dotenv.config()

const getClient = () =>
    Client.fromImpactApiKey({
        impactApiKey: process.env.IMPACT_API_KEY as string,
        jupyterHubToken: process.env.JH_TOKEN as string,
        serverAddress: process.env.JHMI_SERVER as string,
    })

test('get workspaces', () => {
    getClient()
        .getWorkspaces()
        .then(({ data: { items: workspaces } }: GetWorkspacesResponse) =>
            expect(workspaces.length).toBeGreaterThanOrEqual(0)
        )
})

test('create and execute experiment', () => {
    const client = getClient()

    const experimentDefinition = ModelicaExperimentDefinition.from({
        className: 'Modelica.Blocks.Examples.PID_Controller',
    })
    //

    client
        .getWorkspaces()
        .then(({ data: { items: workspaces } }: GetWorkspacesResponse) =>
            expect(workspaces.length).toBeGreaterThanOrEqual(0)
        )
})
