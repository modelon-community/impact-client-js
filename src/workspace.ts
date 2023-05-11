import { CaseId, CustomFunction, ExperimentId, WorkspaceId } from './types'
import Api from './api'
import Experiment from './experiment'
import ExperimentDefinition from './experiment-definition'

class Workspace {
    private api: Api
    id: WorkspaceId
    name: string

    constructor({
        api,
        id,
        name,
    }: {
        api: Api
        id: WorkspaceId
        name: string
    }) {
        this.api = api
        this.id = id
        this.name = name
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

    getExperiment(experimentId: ExperimentId): Promise<Experiment | undefined> {
        return this.api.getExperiment({
            experimentId,
            workspaceId: this.id,
        })
    }
}

export default Workspace
