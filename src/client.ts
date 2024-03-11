import Api from './api'
import Workspace from './workspace'
import { WorkspaceId } from './types'

class Client {
    private api: Api

    private constructor(api: Api) {
        this.api = api
    }

    /**
     * Creates an instance from an Impact API key.
     *
     * @static
     * @param {Object} options - The options for creating an instance.
     * @param {string} [options.jupyterHubToken] - The Jupyter Hub token. Optional.
     * @param {string} [options.jupyterHubUserPath] - The Jupyter Hub user path, extract it
     *                 from the URL when using the Modelon Impact main UI. Optional.
     * @param {string} [options.serverAddress] - The server address. Optional.
     *                 Should only be set for non-browser environments outside jupyter lab.
     *                 For other environments outside JupyterLab the server address
     *                 must be configured in a proxy.
     * @example
     *          Client.fromImpactApiKey({
     *              impactApiKey: "tKQqbeEh6QEVPWe60LCu4nN5fJbkvGYsWM-hcLEH",
     *              jupyterHubUserPath: "/user/username@company.com/",
     *              serverAddress: "https://impact.modelon.cloud",
     *          })
     *
     */
    static fromImpactApiKey({
        impactApiKey,
        jupyterHubUserPath,
        serverAddress,
    }: {
        impactApiKey?: string
        jupyterHubUserPath?: string
        serverAddress?: string
    }) {
        const api = Api.fromImpactApiKey({
            impactApiKey,
            jupyterHubUserPath,
            serverAddress,
        })
        return new Client(api)
    }

    /**
     * Creates an instance assuming Impact Session Cookie exists.
     *
     * @static
     * @param {Object} options - The options for creating an instance.
     * @param {string} [options.jupyterHubUserPath] - The Jupyter Hub user path, extract it
     *                 from the URL when using the Modelon Impact main UI. Optional.
     * @param {string} [options.serverAddress] - The server address. Optional.
     *                 Should only be set for non-browser environments outside jupyter lab.
     *                 For other environments outside JupyterLab the server address
     *                 must be configured in a proxy.
     *
     * @example
     *          Client.fromImpactToken({
     *              jupyterHubUserPath: "/user/username@company.com/",
     *              serverAddress: "https://impact.modelon.cloud",
     *          })
     */
    static fromImpactSession({
        jupyterHubUserPath,
        serverAddress,
    }: {
        jupyterHubUserPath?: string
        serverAddress?: string
    }) {
        const api = Api.fromImpactSession({
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

    delete = (path: string) => this.api.delete(path)
    get = (path: string, accept?: string) => this.api.get(path, accept)
    post = (path: string, body: unknown, accept?: string) =>
        this.api.post(path, body, accept)
    put = (path: string, body: unknown, accept?: string) =>
        this.api.put(path, body, accept)
}

export default Client
