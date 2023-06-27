import * as dotenv from 'dotenv'
import {
    Client,
    ExperimentDefinition,
    InvalidApiKey,
    JhTokenError,
    WorkspaceDefinition,
} from '../../dist'
import basicExperimentDefinition from './basicExperimentDefinition.json'

dotenv.config()

const TwentySeconds = 20 * 1000

const getClient = (options?: {
    impactApiKey?: string
    jupyterHubToken?: string
}) =>
    Client.fromImpactApiKey({
        impactApiKey:
            options?.impactApiKey ||
            (process.env.MODELON_IMPACT_CLIENT_API_KEY as string),
        jupyterHubToken:
            options?.jupyterHubToken ||
            (process.env.JUPYTERHUB_API_TOKEN as string),
        serverAddress: process.env.MODELON_IMPACT_SERVER as string,
    })

const TestWorkspaceName = 'integration-test-ws'

const getTestWorkspace = async (client: Client) => {
    let testWorkspace
    try {
        testWorkspace = await client.getWorkspace(TestWorkspaceName)
    } catch (e) {
        testWorkspace = await client.createWorkspace({
            name: TestWorkspaceName,
        })
    }

    expect(testWorkspace.name).toEqual(TestWorkspaceName)

    return testWorkspace
}

const deleteTestWorkspace = async (client: Client) => {
    await client.deleteWorkspace(TestWorkspaceName)

    const workspacesAfterDelete = await client.getWorkspaces()
    expect(
        workspacesAfterDelete.find(
            (w: WorkspaceDefinition) => w.definition.name === TestWorkspaceName
        )
    ).toEqual(undefined)
}

test('Try to use invalid impact API key', (done) => {
    const client = getClient({ impactApiKey: 'invalid-api-key' })

    client
        .getWorkspace('non-existing-workspace')
        .then(() => {
            throw new Error('Test should have caught error')
        })
        .catch((e) => {
            // instanceof does not work for checking the type here, a ts-jest specific problem perhaps.
            // ApiError has errorCode.
            if ('errorCode' in e) {
                expect(e.errorCode).toEqual(InvalidApiKey)
                expect(e.httpCode).toEqual(400)
                done()
            }
        })
})

test('Try to use invalid jupyter hub token', (done) => {
    const client = getClient({ jupyterHubToken: 'invalid-jh-token' })

    client
        .getWorkspace('non-existing-workspace')
        .then(() => {
            throw new Error('Test should have caught error')
        })
        .catch((e) => {
            // instanceof does not work for checking the type here, a ts-jest specific problem perhaps.
            // ApiError has errorCode.
            if ('errorCode' in e) {
                expect(e.errorCode).toEqual(JhTokenError)
                expect(e.httpCode).toEqual(403)
                done()
            }
        })
})

test(
    'Setup and execute experiment',
    async () => {
        const experimentDefinition = ExperimentDefinition.from(
            basicExperimentDefinition
        )

        const client = getClient()
        const testWorkspace = await getTestWorkspace(client)

        const customFunctions = await testWorkspace.getCustomFunctions()
        expect(customFunctions.length).toBeGreaterThanOrEqual(
            ['dynamic', 'steady state'].length
        )

        try {
            const experiment = await testWorkspace.executeExperimentSync({
                caseIds: ['case_1', 'case_2'],
                experimentDefinition,
            })
            expect(typeof experiment).toBe('object')

            const cases = await experiment.getCases()
            expect(typeof cases).toBe('object')

            if (!cases || cases.length < 2) {
                return
            }

            expect(cases[0].runInfo).toMatchObject({ status: 'successful' })

            const log = await cases[0].getLog()
            expect(typeof log).toBe('string')

            let trajectories = await cases[0].getTrajectories([
                'inertia1.w',
                'inertia1.a',
            ])

            expect(trajectories.length).toBe(2)
            expect(trajectories[0].trajectory.length).toBe(102)
            expect(trajectories[1].trajectory.length).toBe(102)

            trajectories = await cases[1].getTrajectories([
                'inertia1.w',
                'inertia1.a',
            ])
            expect(trajectories.length).toBe(2)
            expect(trajectories[0].trajectory.length).toBe(102)
            expect(trajectories[1].trajectory.length).toBe(102)

            trajectories = await experiment.getTrajectories([
                'inertia1.w',
                'inertia1.a',
            ])
            expect(trajectories[0].items.length).toBe(2)
            expect(trajectories[0].items[0].trajectory.length).toBe(102)
            expect(trajectories[0].items[0].trajectory.length).toBe(102)
            expect(trajectories[1].items.length).toBe(2)
            expect(trajectories[1].items[0].trajectory.length).toBe(102)
            expect(trajectories[1].items[0].trajectory.length).toBe(102)

            const experimentAfterwards = await testWorkspace.getExperiment(
                experiment.id
            )
            expect(experimentAfterwards).not.toBeUndefined()

            await deleteTestWorkspace(client)
        } catch (e) {
            if (e instanceof Error) {
                console.log(e.toString())
            }
            throw new Error('Caught unexpected error while executing test')
        }
    },
    TwentySeconds
)

/* Disabled until WAMS-12202 is resolved.
test(
    'Cancel experiment',
    async () => {
        const experimentDefinition = ExperimentDefinition.from(
            basicExperimentDefinition
        )

        const client = getClient()
        const testWorkspace = await getTestWorkspace(client)

        try {
            const experiment = await testWorkspace.executeExperiment({
                caseIds: ['case_1', 'case_2'],
                experimentDefinition,
            })
            expect(typeof experiment).toBe('object')

            await experiment.cancel()

            let status = await experiment.getExecutionStatus()

            let tries = 0
            const MAX_TRIES = 5

            while (status.status.status !== 'cancelled' && tries < MAX_TRIES) {
                status = await experiment.getExecutionStatus()
                await new Promise((resolve) => setTimeout(resolve, 100))

                tries++
            }
            expect(tries).toBeLessThan(MAX_TRIES)

            await deleteTestWorkspace(client)
        } catch (e) {
            if (e instanceof Error) {
                console.log(e.toString())
            }
            throw new Error('Caught unexpected error while executing test')
        }
    },
    TwentySeconds
)
*/

test(
    'Run simulation and track progress',
    async () => {
        const experimentDefinition = ExperimentDefinition.from(
            basicExperimentDefinition
        )

        const client = getClient()
        const testWorkspace = await getTestWorkspace(client)

        try {
            let done = false
            const experiment = await testWorkspace.executeExperiment({
                caseIds: ['case_1', 'case_2'],
                experimentDefinition,
            })
            while (!done) {
                const status = await experiment.getExecutionStatus()

                await new Promise((resolve) => setTimeout(resolve, 100))

                if (status.getSimulationProgress() === 1) {
                    expect(status.getCompilationProgress() === 1)
                    done = true
                }
            }

            await deleteTestWorkspace(client)
        } catch (e) {
            if (e instanceof Error) {
                console.log(e.toString())
            }
            throw new Error('Caught unexpected error while executing test')
        }
    },
    TwentySeconds
)
