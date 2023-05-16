import {
    CaseId,
    ExperimentId,
    ExperimentTrajectories,
    WorkspaceId,
} from './types'
import Api from './api'
import Case from './case'
import ExecutionStatus from './executionStatus'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

class Experiment {
    private api: Api
    id: ExperimentId
    private workspaceId: WorkspaceId

    constructor({
        api,
        id,
        workspaceId,
    }: {
        api: Api
        id: ExperimentId
        workspaceId: WorkspaceId
    }) {
        this.api = api
        this.id = id
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

    getTrajectories = async (
        variableNames: string[]
    ): Promise<ExperimentTrajectories> =>
        this.api.getExperimentTrajectories({
            experimentId: this.id,
            variableNames,
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
