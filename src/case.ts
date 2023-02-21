import {
    CaseRunInfo,
    CaseId,
    CaseTrajectories,
    ExperimentId,
    WorkspaceId,
} from './types'
import Api from './api'

class Case {
    private api: Api
    private experimentId: ExperimentId
    id: CaseId
    runInfo: CaseRunInfo
    private workspaceId: WorkspaceId

    constructor({
        api,
        experimentId,
        id,
        runInfo,
        workspaceId,
    }: {
        api: Api
        id: CaseId
        experimentId: ExperimentId
        runInfo: CaseRunInfo
        workspaceId: WorkspaceId
    }) {
        this.api = api
        this.id = id
        this.runInfo = runInfo
        this.experimentId = experimentId
        this.workspaceId = workspaceId
    }

    getLog() {
        return this.api.getCaseLog({
            caseId: this.id,
            experimentId: this.experimentId,
            workspaceId: this.workspaceId,
        })
    }

    getTrajectories(variableNames: string[]): Promise<CaseTrajectories> {
        return this.api.getCaseTrajectories({
            caseId: this.id,
            experimentId: this.experimentId,
            variableNames,
            workspaceId: this.workspaceId,
        })
    }
}

export default Case
