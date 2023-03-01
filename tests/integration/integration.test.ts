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

const getClient = (options?: {
    impactApiKey?: string
    jupyterHubToken?: string
}) =>
    Client.fromImpactApiKey({
        impactApiKey:
            options?.impactApiKey || (process.env.IMPACT_API_KEY as string),
        jupyterHubToken:
            options?.jupyterHubToken || (process.env.JH_TOKEN as string),
        serverAddress: process.env.JHMI_SERVER as string,
    })

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
        const WorkspaceName = 'setup-and-exec'

        let testWorkspace
        try {
            testWorkspace = await client.getWorkspace(WorkspaceName)
        } catch (e) {
            testWorkspace = await client.createWorkspace({
                name: WorkspaceName,
            })
        }

        expect(testWorkspace.name).toEqual(WorkspaceName)

        const customFunctions = await testWorkspace.getCustomFunctions()
        expect(customFunctions.length).toBeGreaterThanOrEqual(
            ['linearize', 'dynamic', 'steady state'].length
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

            await client.deleteWorkspace(WorkspaceName)

            const workspacesAfterDelete = await client.getWorkspaces()
            expect(
                workspacesAfterDelete.find(
                    (w: WorkspaceDefinition) =>
                        w.definition.name === WorkspaceName
                )
            ).toEqual(undefined)
        } catch (e) {
            if (e instanceof Error) {
                console.log(e.toString())
            }
            throw new Error('Caught unexpected error while executing test')
        }
    },
    20 * 1000
)
