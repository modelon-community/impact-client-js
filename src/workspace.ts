import { CaseId, CustomFunction, ExperimentId, WorkspaceId } from './types'
import Api from './api'
import Experiment from './experiment'
import ExperimentDefinition from './experiment-definition'
import Project from './project'

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

    private createExperiment = async (
        experimentDefinition: ExperimentDefinition
    ): Promise<Experiment> => {
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

    executeExperiment = async ({
        caseIds,
        experimentDefinition,
    }: {
        caseIds: CaseId[]
        experimentDefinition: ExperimentDefinition
    }): Promise<Experiment> => {
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

    executeExperimentSync = async ({
        caseIds,
        experimentDefinition,
    }: {
        caseIds: CaseId[]
        experimentDefinition: ExperimentDefinition
    }): Promise<Experiment> => {
        const experiment = await this.createExperiment(experimentDefinition)

        await experiment.run(caseIds)
        await experiment.executionDone()

        return experiment
    }

    getCustomFunctions = async (): Promise<CustomFunction[]> => {
        return this.api.getCustomFunctions(this.id)
    }

    getExperiment = async (
        experimentId: ExperimentId
    ): Promise<Experiment | undefined> => {
        return this.api.getExperiment({
            experimentId,
            workspaceId: this.id,
        })
    }

    getExperiments = async (): Promise<Experiment[]> =>
        this.api.getWorkspaceExperiments(this.id)

    getProjects = async (): Promise<Project[]> =>
        this.api.getWorkspaceProjects(this.id)
}

export default Workspace
