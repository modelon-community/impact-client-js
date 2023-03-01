import { CaseId, CustomFunction, WorkspaceId } from './types'
import Api from './api'
import Experiment from './experiment'
import ExperimentDefinition from './experiment-definition'

class Workspace {
    private api: Api
    id: WorkspaceId

    constructor({ api, id }: { api: Api; id: WorkspaceId }) {
        this.api = api
        this.id = id
    }

    private async createExperiment(
        experimentDefinition: ExperimentDefinition
    ): Promise<Experiment> {
        const experimentId = await this.api.createExperiment({
            experimentDefinition,
            workspaceId: this.id,
        })
        return new Experiment({
            api: this.api,
            id: experimentId,
            workspaceId: this.id,
        })
    }

    async executeExperiment({
        caseIds,
        experimentDefinition,
    }: {
        caseIds: CaseId[]
        experimentDefinition: ExperimentDefinition
    }): Promise<Experiment> {
        const experiment = await this.createExperiment(experimentDefinition)

        await this.api.runExperiment({
            cases: caseIds,
            experimentId: experiment.id,
            workspaceId: this.id,
        })

        return new Experiment({
            api: this.api,
            id: experiment.id,
            workspaceId: this.id,
        })
    }

    async executeExperimentSync({
        caseIds,
        experimentDefinition,
    }: {
        caseIds: CaseId[]
        experimentDefinition: ExperimentDefinition
    }): Promise<Experiment> {
        const experiment = await this.createExperiment(experimentDefinition)

        await experiment.run(caseIds)
        await experiment.executionDone()

        return experiment
    }

    getCustomFunctions(): Promise<CustomFunction[]> {
        return this.api.getCustomFunctions(this.id)
    }
}

export default Workspace
