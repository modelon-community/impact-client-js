import { CaseId, CustomFunction, Workspace, WorkspaceId } from './types'
import Api from './api'
import Experiment from './experiment'
import ExperimentDefinition from './experiment-definition'

class Client {
    private api: Api

    private constructor(api: Api) {
        this.api = api
    }

    static fromImpactApiKey({
        impactApiKey,
        jupyterHubToken,
        jupyterHubUserPath,
        serverAddress,
    }: {
        impactApiKey: string
        jupyterHubToken: string
        jupyterHubUserPath?: string
        serverAddress: string
    }) {
        const api = Api.fromImpactApiKey({
            impactApiKey,
            jupyterHubToken,
            jupyterHubUserPath,
            serverAddress,
        })
        return new Client(api)
    }

    static fromImpactToken({
        impactToken,
        jupyterHubToken,
        jupyterHubUserPath,
        serverAddress,
    }: {
        impactToken: string
        jupyterHubToken: string
        jupyterHubUserPath?: string
        serverAddress: string
    }) {
        const api = Api.fromImpactToken({
            impactToken,
            jupyterHubToken,
            jupyterHubUserPath,
            serverAddress,
        })
        return new Client(api)
    }

    getWorkspaces(): Promise<Workspace[]> {
        return this.api.getWorkspaces()
    }

    private async createExperiment({
        experimentDefinition,
        workspaceId,
    }: {
        experimentDefinition: ExperimentDefinition
        workspaceId: WorkspaceId
    }): Promise<Experiment> {
        const experimentId = await this.api.createExperiment({
            experimentDefinition,
            workspaceId,
        })
        return new Experiment({
            api: this.api,
            id: experimentId,
            workspaceId,
        })
    }

    async createWorkspace({
        description,
        name,
    }: {
        description?: string
        name: string
    }): Promise<WorkspaceId> {
        return await this.api.createWorkspace({
            description,
            name,
        })
    }

    async deleteWorkspace(workspaceId: WorkspaceId): Promise<void> {
        return await this.api.deleteWorkspace(workspaceId)
    }

    async executeExperiment({
        caseIds,
        experimentDefinition,
        workspaceId,
    }: {
        caseIds: CaseId[]
        experimentDefinition: ExperimentDefinition
        workspaceId: WorkspaceId
    }): Promise<Experiment> {
        const experiment = await this.createExperiment({
            experimentDefinition,
            workspaceId,
        })

        await this.api.runExperiment({
            cases: caseIds,
            experimentId: experiment.id,
            workspaceId,
        })

        return new Experiment({
            api: this.api,
            id: experiment.id,
            workspaceId,
        })
    }

    async executeExperimentSync({
        caseIds,
        experimentDefinition,
        workspaceId,
    }: {
        caseIds: CaseId[]
        experimentDefinition: ExperimentDefinition
        workspaceId: WorkspaceId
    }): Promise<Experiment> {
        const experiment = await this.createExperiment({
            experimentDefinition,
            workspaceId,
        })

        await experiment.run(caseIds)
        await experiment.executionDone()

        return experiment
    }

    getCustomFunctions(workspaceId: WorkspaceId): Promise<CustomFunction[]> {
        return this.api.getCustomFunctions(workspaceId)
    }
}

export default Client
