import Api from './api'
import Workspace from './workspace'
import { WorkspaceDefinition, WorkspaceId } from './types'

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

    getWorkspaces = (): Promise<WorkspaceDefinition[]> => {
        return this.api.getWorkspaces()
    }

    getWorkspace = async (workspaceId: WorkspaceId): Promise<Workspace> => {
        const workspaceDefinitions = await this.getWorkspaces()

        const workspaceDefinition = workspaceDefinitions.find(
            (ws) => ws.id === workspaceId
        )
        if (workspaceDefinition) {
            return new Workspace({
                api: this.api,
                id: workspaceId,
                name: workspaceDefinition.definition.name,
            })
        }
        throw new Error(`Workspace "${workspaceId}" not found.`)
    }

    createWorkspace = async ({
        description,
        name,
    }: {
        description?: string
        name: string
    }): Promise<Workspace> => {
        const workspaceId = await this.api.createWorkspace({
            description,
            name,
        })

        return new Workspace({ api: this.api, id: workspaceId, name })
    }

    deleteWorkspace = async (workspaceId: WorkspaceId): Promise<void> => {
        return await this.api.deleteWorkspace(workspaceId)
    }

    setImpactToken = (token: string) => this.api.setImpactToken(token)
}

export default Client
