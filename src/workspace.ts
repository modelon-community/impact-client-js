import {
    CaseId,
    CustomFunction,
    CustomFunctionOptions,
    ExperimentId,
    ExperimentItem,
    WorkspaceDefinition,
    WorkspaceId,
} from './types'
import Api from './api'
import Experiment from './experiment'
import ExperimentDefinition from './experiment-definition'
import ModelExecutable from './model-executable'
import Project from './project'

class Workspace {
    constructor(
        private api: Api,
        public definition: WorkspaceDefinition,
        public id: WorkspaceId
    ) {}

    private createExperiment = async (
        experimentDefinition: ExperimentDefinition
    ): Promise<Experiment> => {
        const experimentId = await this.api.createExperiment({
            modelicaExperimentDefinition:
                experimentDefinition.toModelicaExperimentDefinition(),
            workspaceId: this.id,
        })
        return new Experiment({
            api: this.api,
            definition: experimentDefinition,
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
            definition: experimentDefinition,
            id: experiment.id,
            workspaceId: this.id,
        })
    }

    executeExperimentUntilDone = async ({
        caseIds,
        experimentDefinition,
        timeoutMs,
    }: {
        caseIds: CaseId[]
        experimentDefinition: ExperimentDefinition
        timeoutMs: number
    }): Promise<Experiment> => {
        const experiment = await this.createExperiment(experimentDefinition)

        await experiment.run(caseIds)
        await experiment.executionDone(timeoutMs)

        return experiment
    }

    getCustomFunctions = async (): Promise<CustomFunction[]> => {
        return this.api.getCustomFunctions(this.id)
    }

    getCustomFunctionOptions = async (
        name: string
    ): Promise<CustomFunctionOptions> => {
        return await this.api.getCustomFunctionOptions({
            customFunction: name,
            workspaceId: this.id,
        })
    }

    getExperiment = async (
        experimentId: ExperimentId
    ): Promise<Experiment | undefined> => {
        const experimentItem = await this.api.getExperiment({
            experimentId,
            workspaceId: this.id,
        })

        if (!experimentItem) {
            return undefined
        }

        return new Experiment({
            api: this.api,
            definition: experimentItem['experiment']
                ? ExperimentDefinition.fromModelicaExperimentDefinition(
                      experimentItem['experiment']
                  )
                : undefined,
            id: experimentId,
            metaData: experimentItem['meta_data'],
            workspaceId: this.id,
        })
    }

    getExperiments = async (): Promise<Experiment[]> => {
        const experimentItems = await this.api.getWorkspaceExperiments(this.id)

        if (!experimentItems) {
            return []
        }

        return experimentItems.map(
            (experimentItem: ExperimentItem) =>
                new Experiment({
                    api: this.api,
                    definition: experimentItem['experiment']
                        ? ExperimentDefinition.fromModelicaExperimentDefinition(
                              experimentItem['experiment']
                          )
                        : undefined,
                    id: experimentItem.id ?? '',
                    metaData: experimentItem['meta_data'],
                    workspaceId: this.id,
                })
        )
    }

    getModelExecutables = async (): Promise<ModelExecutable[]> => {
        const modelExecutableInfos = await this.api.getModelExecutableInfos(
            this.id
        )

        if (!modelExecutableInfos) {
            return []
        }

        return modelExecutableInfos.map((info) => {
            return ModelExecutable.from({
                api: this.api,
                fmuId: info.id,
                workspaceId: this.id,
            })
        })
    }

    getProjects = async (): Promise<Project[]> =>
        this.api.getWorkspaceProjects(this.id)
}

export default Workspace
