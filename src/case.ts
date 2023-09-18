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
    constructor(
        private api: Api,
        public id: CaseId,
        private experimentId: ExperimentId,
        public runInfo: CaseRunInfo,
        private workspaceId: WorkspaceId,
        private fmuId?: FmuId
    ) {}

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
