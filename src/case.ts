import {
    CaseRunInfo,
    CaseId,
    CaseTrajectories,
    ExperimentId,
    FmuId,
    WorkspaceId,
} from './types'
import Api from './api'
import ModelExecutable from './model-executable'

class Case {
    private api: Api
    private experimentId: ExperimentId
    private fmuId?: FmuId
    id: CaseId
    runInfo: CaseRunInfo
    private workspaceId: WorkspaceId

    constructor({
        api,
        experimentId,
        fmuId,
        id,
        runInfo,
        workspaceId,
    }: {
        api: Api
        id: CaseId
        fmuId?: FmuId
        experimentId: ExperimentId
        runInfo: CaseRunInfo
        workspaceId: WorkspaceId
    }) {
        this.api = api
        this.fmuId = fmuId
        this.id = id
        this.runInfo = runInfo
        this.experimentId = experimentId
        this.workspaceId = workspaceId
    }

    getInput = () =>
        this.api.getCaseInput({
            caseId: this.id,
            experimentId: this.experimentId,
            workspaceId: this.workspaceId,
        })

    getLog = () =>
        this.api.getCaseLog({
            caseId: this.id,
            experimentId: this.experimentId,
            workspaceId: this.workspaceId,
        })

    getModelExecutable = async () => {
        if (!this.fmuId) {
            return null
        }

        return ModelExecutable.from({
            api: this.api,
            fmuId: this.fmuId,
            workspaceId: this.workspaceId,
        })
    }

    getTrajectories = (variableNames: string[]): Promise<CaseTrajectories> =>
        this.api.getCaseTrajectories({
            caseId: this.id,
            experimentId: this.experimentId,
            variableNames,
            workspaceId: this.workspaceId,
        })
}

export default Case
