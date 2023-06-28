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
        jupyterHubToken?: string
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
        jupyterHubToken?: string
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

    getWorkspaces = (): Promise<Workspace[]> => this.api.getWorkspaces()

    getWorkspace = async (workspaceId: WorkspaceId): Promise<Workspace> => {
        const workspaces = await this.getWorkspaces()

        const workspace = workspaces.find((ws) => ws.id === workspaceId)
        if (workspace) {
            return workspace
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
        const workspace = await this.api.createWorkspace({
            description,
            name,
        })

        return workspace
    }

    deleteWorkspace = async (workspaceId: WorkspaceId): Promise<void> => {
        return await this.api.deleteWorkspace(workspaceId)
    }

    setImpactToken = (token: string) => this.api.setImpactToken(token)

    delete = (path: string) => this.api.delete(path)
    get = (path: string, accept?: string) => this.api.get(path, accept)
    post = (path: string, body: unknown, accept?: string) =>
        this.api.post(path, body, accept)
    put = (path: string, body: unknown, accept?: string) =>
        this.api.put(path, body, accept)
}

export default Client
