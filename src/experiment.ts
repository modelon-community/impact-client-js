import { CaseId, ExperimentId, WorkspaceId } from './types'
import Api from './api'
import Case from './case'

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

    async getCases() {
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

    getTrajectories(variableNames: string[]) {
        return this.api.getExperimentTrajectories({
            experimentId: this.id,
            variableNames,
            workspaceId: this.workspaceId,
        })
    }

    run(cases: CaseId[]): Promise<void> {
        return this.api.runExperiment({
            cases,
            experimentId: this.id,
            workspaceId: this.workspaceId,
        })
    }

    async executionDone() {
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

    async getExecutionStatus() {
        return await this.api.getExecutionStatus({
            experimentId: this.id,
            workspaceId: this.workspaceId,
        })
    }
}

export default Experiment
