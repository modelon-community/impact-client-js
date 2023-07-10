import {
    CaseId,
    ExperimentId,
    ExperimentMetaData,
    ExperimentRunInfo,
    ExperimentTrajectories,
    WorkspaceId,
} from './types'
import Api from './api'
import Case from './case'
import ExecutionStatus from './executionStatus'
import ExperimentDefinition from './experiment-definition'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

class Experiment {
    private api: Api
    id: ExperimentId
    private workspaceId: WorkspaceId
    private definition: ExperimentDefinition | null
    private metaData: ExperimentMetaData | null

    constructor({
        api,
        definition,
        id,
        metaData,
        workspaceId,
    }: {
        api: Api
        definition?: ExperimentDefinition
        id: ExperimentId
        metaData?: ExperimentMetaData
        workspaceId: WorkspaceId
    }) {
        this.api = api
        this.definition = definition ?? null
        this.id = id
        this.metaData = metaData ?? null
        this.workspaceId = workspaceId
    }

    getCases = async () => {
        const casesResponse = await this.api.getCases({
            experimentId: this.id,
            workspaceId: this.workspaceId,
        })
        if (!casesResponse) {
            // TODO: Throw error
            return []
        }

        return casesResponse.map(
            (caseResponse, i) =>
                new Case({
                    api: this.api,
                    experimentId: this.id,
                    id: caseResponse.id || i.toString(),
                    runInfo: caseResponse.run_info,
                    workspaceId: this.workspaceId,
                })
        )
    }

    getMetaData = async (): Promise<ExperimentMetaData | null> => {
        if (this.metaData) {
            return this.metaData
        }
        const experimentItem = await this.api.getExperiment({
            experimentId: this.id,
            workspaceId: this.workspaceId,
        })

        this.metaData = experimentItem?.meta_data ?? null

        return this.metaData
    }

    getDefinition = async (): Promise<ExperimentDefinition | null> => {
        if (this.definition) {
            return this.definition
        }
        const experimentItem = await this.api.getExperiment({
            experimentId: this.id,
            workspaceId: this.workspaceId,
        })

        if (!experimentItem || !experimentItem.experiment) {
            return null
        }

        this.definition = ExperimentDefinition.fromModelicaExperimentDefinition(
            experimentItem.experiment
        )

        return this.definition

        return this.definition
    }

    getRunInfo = async (): Promise<ExperimentRunInfo | null> => {
        const experimentItem = await this.api.getExperiment({
            experimentId: this.id,
            workspaceId: this.workspaceId,
        })

        return experimentItem?.run_info
    }

    getTrajectories = async (
        variableNames: string[]
    ): Promise<ExperimentTrajectories> =>
        this.api.getExperimentTrajectories({
            experimentId: this.id,
            variableNames,
            workspaceId: this.workspaceId,
        })

    getVariables = async (): Promise<ExperimentTrajectories> =>
        this.api.getExperimentVariables({
            experimentId: this.id,
            workspaceId: this.workspaceId,
        })

    cancel = async (): Promise<void> => {
        await this.api.cancelExperiment({
            experimentId: this.id,
            workspaceId: this.workspaceId,
        })
    }

    run = async (cases: CaseId[]): Promise<void> =>
        this.api.runExperiment({
            cases,
            experimentId: this.id,
            workspaceId: this.workspaceId,
        })

    executionDone = async () => {
        let data = await this.api.getExecutionStatus({
            experimentId: this.id,
            workspaceId: this.workspaceId,
        })
        while (data.status !== 'done') {
            await sleep(1000)
            data = await this.api.getExecutionStatus({
                experimentId: this.id,
                workspaceId: this.workspaceId,
            })
        }
    }

    getExecutionStatus = async () => {
        const status = await this.api.getExecutionStatus({
            experimentId: this.id,
            workspaceId: this.workspaceId,
        })

        return new ExecutionStatus(status)
    }
}

export default Experiment
