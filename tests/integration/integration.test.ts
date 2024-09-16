import * as dotenv from 'dotenv'
import {
    Analysis,
    ApiError,
    Client,
    ExperimentDefinition,
    InvalidApiKey,
    Model,
} from '../../dist'
import { ModelicaExperimentDefinition } from '../../src/types'
import { beforeEach, expect, test } from 'vitest'
import { components } from '../../src/schema/impact-api'
import { basicExperimentDefinitionMockData } from '../mock-data/basic-experiment-definition.mock-data'

dotenv.config()

const TwentySeconds = 20 * 1000

const getClient = (options?: { impactApiKey?: string }) =>
    Client.fromImpactApiKey({
        impactApiKey:
            options?.impactApiKey ||
            (process.env.MODELON_IMPACT_CLIENT_API_KEY as string),
        serverAddress: process.env.MODELON_IMPACT_SERVER as string,
    })

const TestWorkspaceName = 'integration-test-ws'

beforeEach(async () => {
    const client = getClient()
    await deleteTestWorkspace(client)
})

const getTestWorkspace = async (client: Client) => {
    const testWorkspace = await client.createWorkspace({
        name: TestWorkspaceName,
    })

    expect(testWorkspace.definition.name).toEqual(TestWorkspaceName)

    return testWorkspace
}

const deleteTestWorkspace = async (client: Client) => {
    const workspaces = await client.getWorkspaces()

    const deletePromises = workspaces
        .filter((ws) => ws.definition.name === TestWorkspaceName)
        .map((ws) => {
            client.deleteWorkspace(ws.id)
        })

    await Promise.all(deletePromises)
}

test('Try to use invalid impact API key', async () => {
    const client = getClient({ impactApiKey: 'invalid-api-key' })

    try {
        await client.getWorkspace('non-existing-workspace')
        throw new Error('Test should have caught error')
    } catch (e) {
        // instanceof does not work for checking the type here, a ts-jest specific problem perhaps.
        // ApiError has errorCode.
        const error = e as ApiError
        expect(error.errorCode).toEqual(InvalidApiKey)
        expect(error.httpCode).toEqual(400)
    }
})

test(
    'Setup and execute experiment from json experiment definition',
    async () => {
        const experimentDefinition =
            ExperimentDefinition.fromModelicaExperimentDefinition(
                basicExperimentDefinitionMockData as unknown as ModelicaExperimentDefinition
            )

        const client = getClient()
        const testWorkspace = await getTestWorkspace(client)

        const customFunctions = await testWorkspace.getCustomFunctions()
        expect(customFunctions.length).toBeGreaterThanOrEqual(
            ['dynamic', 'steady state'].length
        )

        const caseIds = experimentDefinition
            .getCaseDefinitions()
            .map((def: { caseId: string }) => def.caseId)

        const experiment = await testWorkspace.executeExperimentUntilDone({
            caseIds,
            experimentDefinition,
            timeoutMs: 60 * 1000,
        })
        expect(typeof experiment).toBe('object')

        const cases = await experiment.getCases()
        expect(typeof cases).toBe('object')

        if (!cases || cases.length < 1) {
            throw new Error('No cases returned')
        }

        expect(cases[0].runInfo).toMatchObject({ status: 'successful' })

        const log = await cases[0].getLog()
        expect(typeof log).toBe('string')

        const [
            trajectoriesFirstCase,
            trajectoriesSecondCase,
            experimentTrajectories,
        ] = await Promise.all([
            cases[0].getTrajectories(['inertia1.w', 'inertia1.a']),
            cases[1].getTrajectories(['inertia1.w', 'inertia1.a']),
            experiment.getTrajectories(['inertia1.w', 'inertia1.a']),
        ])

        expect(trajectoriesFirstCase.length).toBe(2)
        expect(trajectoriesFirstCase[0].trajectory?.length).toBe(502)
        expect(trajectoriesFirstCase[1].trajectory?.length).toBe(502)

        expect(trajectoriesSecondCase.length).toBe(2)
        expect(trajectoriesSecondCase[0].trajectory?.length).toBe(502)
        expect(trajectoriesSecondCase[1].trajectory?.length).toBe(502)

        expect(experimentTrajectories[0].items?.length).toBe(2)
        expect(experimentTrajectories[0].items?.[0].trajectory?.length).toBe(
            502
        )
        expect(experimentTrajectories[0].items?.[0].trajectory?.length).toBe(
            502
        )
        expect(experimentTrajectories[1].items?.length).toBe(2)
        expect(experimentTrajectories[1].items?.[0].trajectory?.length).toBe(
            502
        )
        expect(experimentTrajectories[1].items?.[0].trajectory?.length).toBe(
            502
        )

        const experimentAfterwards = await testWorkspace.getExperiment(
            experiment.id
        )

        const metaData = await experimentAfterwards?.getMetaData()
        expect(metaData?.label).not.toBeUndefined()
        const definition = await experimentAfterwards?.getDefinition()

        const modelicaModel =
            definition?.model.toModelDefinition() as components['schemas']['ModelicaEnvelop']

        expect(modelicaModel.modelica.className).toEqual(
            'Modelica.Blocks.Examples.PID_Controller'
        )

        const runInfo = await experimentAfterwards?.getRunInfo()
        if (runInfo) {
            const someExpectedProps = ['status', 'datetime_started']
            someExpectedProps.forEach((propName) => {
                expect(Object.keys(runInfo).includes(propName)).toEqual(true)
            })
        }

        const variables = await experimentAfterwards?.getVariables()
        expect(variables).toContain('driveAngle')

        const workspaceExperiments = await testWorkspace.getExperiments()

        expect(workspaceExperiments.length).toEqual(1)
        if (metaData) {
            const someExpectedProps = ['model_names', 'experiment_hash']
            someExpectedProps.forEach((propName) => {
                expect(Object.keys(metaData).includes(propName)).toEqual(true)
            })
        }

        const projects = await testWorkspace.getProjects()
        expect(projects.length).toEqual(1)
    },
    TwentySeconds
)

test(
    'Setup and execute experiment via convenience classes',
    async () => {
        const client = getClient()
        const testWorkspace = await getTestWorkspace(client)

        const customFunction = 'dynamic'
        const customFunctionOptions =
            await testWorkspace.getCustomFunctionOptions(customFunction)
        const analysis = Analysis.from({
            customFunctionOptions: customFunctionOptions,
            type: customFunction,
        })
        const model = Model.from({
            className: 'Modelica.Blocks.Examples.PID_Controller',
            customFunctionOptions,
        })

        const experimentDefinition = ExperimentDefinition.from({
            analysis,
            model,
        })

        const experiment = await testWorkspace.executeExperimentUntilDone({
            caseIds: ['case_1', 'case_2'],
            experimentDefinition,
            timeoutMs: 60 * 1000,
        })
        expect(typeof experiment).toBe('object')
    },
    TwentySeconds
)

test(
    'Cancel experiment',
    async () => {
        const experimentDefinition =
            ExperimentDefinition.fromModelicaExperimentDefinition(
                basicExperimentDefinitionMockData as unknown as ModelicaExperimentDefinition
            )

        const client = getClient()
        const testWorkspace = await getTestWorkspace(client)

        const experiment = await testWorkspace.executeExperiment({
            caseIds: ['case_1', 'case_2'],
            experimentDefinition,
        })
        expect(typeof experiment).toBe('object')

        await experiment.cancel()

        let status = await experiment.getExecutionStatus()

        let tries = 0
        const MAX_TRIES = 10

        while (status.status.status !== 'cancelled' && tries < MAX_TRIES) {
            status = await experiment.getExecutionStatus()
            await new Promise((resolve) => setTimeout(resolve, 1000))

            tries++
        }
        expect(tries).toBeLessThan(MAX_TRIES)
    },
    TwentySeconds
)

test(
    'Timeout execution',
    async () => {
        const experimentDefinition =
            ExperimentDefinition.fromModelicaExperimentDefinition(
                basicExperimentDefinitionMockData as unknown as ModelicaExperimentDefinition
            )

        const client = getClient()
        const testWorkspace = await getTestWorkspace(client)
        expect.hasAssertions()
        try {
            await testWorkspace.executeExperimentUntilDone({
                caseIds: ['case_1', 'case_2'],
                experimentDefinition,
                timeoutMs: 10,
            })
        } catch (e) {
            expect(e).toEqual(new Error('Timeout'))
        }
    },
    TwentySeconds
)

test(
    'Run simulation and track progress',
    async () => {
        const experimentDefinition =
            ExperimentDefinition.fromModelicaExperimentDefinition(
                basicExperimentDefinitionMockData as unknown as ModelicaExperimentDefinition
            )

        const client = getClient()
        const testWorkspace = await getTestWorkspace(client)

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
    },
    TwentySeconds
)

test(
    'Run simulation then examine ModelExecutable and ModelDescription',
    async () => {
        const experimentDefinition =
            ExperimentDefinition.fromModelicaExperimentDefinition(
                basicExperimentDefinitionMockData as unknown as ModelicaExperimentDefinition
            )

        const client = getClient()
        const testWorkspace = await getTestWorkspace(client)

        const experiment = await testWorkspace.executeExperimentUntilDone({
            caseIds: ['case_1', 'case_2'],
            experimentDefinition,
            timeoutMs: TwentySeconds,
        })

        const cases = await experiment.getCases()
        const modelExecutable = await cases[0].getModelExecutable()
        expect(modelExecutable).not.toBeNull()
        if (modelExecutable) {
            const caseModelExecutableInfo =
                await modelExecutable.getModelExecutableInfo()
            expect(caseModelExecutableInfo.input?.class_name).toEqual(
                'Modelica.Blocks.Examples.PID_Controller'
            )
        }

        const modelExecutables = await testWorkspace.getModelExecutables()
        expect(modelExecutables.length).toEqual(1)
        const modelDescription = await modelExecutables[0].getModelDescription()
        expect(modelDescription.getModelName()).toEqual(
            'Modelica.Blocks.Examples.PID_Controller'
        )
        const modelExecutableInfo =
            await modelExecutables[0].getModelExecutableInfo()
        expect(modelExecutableInfo.input?.class_name).toEqual(
            'Modelica.Blocks.Examples.PID_Controller'
        )
    },
    TwentySeconds
)
