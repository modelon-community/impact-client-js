import * as dotenv from 'dotenv'
import { Client } from '../..'
import { ModelicaExperiment } from '../../src/ModelicaExperiment'
import { Workspace } from '../../src/types'

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
        .then((workspaces: Workspace[]) =>
            expect(workspaces.length).toBeGreaterThanOrEqual(0)
        )
})

test(
    'Setup and execute experiment',
    async () => {
        const customFunction = 'dynamic'
        const modelName = 'Modelica.Blocks.Examples.PID_Controller'
        const experiment = ModelicaExperiment.from({
            customFunction,
            modelName,
            parameters: {
                start_time: 0,
                final_time: 1,
            },
        })

        const workspaceId = 'friday0916'

        const client = getClient()

        const experimentId = await client.executeExperiment({
            caseIds: ['case_1'],
            experiment,
            workspaceId,
        })
        expect(typeof experimentId).toBe('string')

        const cases = await client.getCases({
            experimentId,
            workspaceId,
        })
        expect(typeof cases).toBe('object')

        const trajectories = await client.getTrajectories({
            caseId: 'case_1',
            experimentId,
            variableNames: ['inertia1.w'],
            workspaceId,
        })
        expect(trajectories.length).toBe(1)
        expect(trajectories[0].length).toBe(502)
    },
    20 * 1000
)
