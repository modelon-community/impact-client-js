import Axios, { AxiosError, AxiosInstance } from 'axios'
import ApiError, {
    JhTokenError,
    MissingAccessTokenCookie,
    MissingJupyterHubToken,
    ServerNotStarted,
    UnknownApiError,
} from './api-error'
import { Cookie, CookieJar } from 'tough-cookie'
import Project from './project'
import Workspace from './workspace'
import {
    Case,
    CaseId,
    CaseTrajectories,
    CustomFunction,
    CustomFunctionOptions,
    ExecutionStatusType,
    ExperimentId,
    ExperimentItem,
    ExperimentTrajectories,
    ExperimentVariables,
    LocalProjectProtocol,
    ModelicaExperimentDefinition,
    ProjectId,
    WorkspaceProtocol,
    WorkspaceId,
} from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importModule(moduleName: string): Promise<any> {
    return await import(moduleName)
}

interface AxiosConfig {
    headers: Record<string, string>
    jar?: CookieJar
}

const isNode = () => typeof window === 'undefined'

const getCookieValue = (key: string) => {
    const parts = `; ${document.cookie}`.split(`; ${key}=`)

    return parts.length === 2 ? parts.pop()?.split(';').shift() : undefined
}

const getValueFromJarCookies = (key: string, cookies: Cookie[]): string => {
    const cookie = cookies.find((c) => c.key === key)

    if (!cookie) {
        throw new ApiError({
            errorCode: MissingAccessTokenCookie,
            message: 'Access token cookie not found',
        })
    }
    return cookie.value
}

const toApiError = (e: AxiosError | Error) => {
    if (e instanceof AxiosError) {
        return new ApiError({
            errorCode: e.response?.data?.error?.code || UnknownApiError,
            httpCode: e.response?.status,
            message: e.response?.data?.error?.message || 'Api Error',
        })
    }
    return e
}

class Api {
    private axios!: AxiosInstance
    private axiosConfig!: AxiosConfig
    private baseUrl: string
    private impactApiKey?: string
    private impactToken?: string
    private jhToken: string
    private jhUserPath: string | undefined

    private configureAxios() {
        const headers: Record<string, string> = {
            Authorization: `token ${this.jhToken}`,
        }
        if (this.impactToken) {
            headers['Impact-Authorization'] = `Bearer ${this.impactToken}`
        }
        this.axiosConfig = { headers }
        this.axios = Axios.create(this.axiosConfig)
    }

    private constructor({
        impactApiKey,
        impactToken,
        jupyterHubToken,
        serverAddress,
        jupyterHubUserPath,
    }: {
        impactApiKey?: string
        impactToken?: string
        jupyterHubToken?: string
        serverAddress?: string
        jupyterHubUserPath?: string
    }) {
        this.baseUrl = serverAddress || ''
        this.impactApiKey = impactApiKey
        this.impactToken = impactToken

        if (jupyterHubToken) {
            this.jhToken = jupyterHubToken
        } else {
            // No provided JupyterHub token, to mimick impact-python-client we try to
            // fallback on the environment variable available inside JupyterHub.
            if (
                typeof process !== 'undefined' &&
                process?.env?.JUPYTERHUB_API_TOKEN
            ) {
                this.jhToken = process.env.JUPYTERHUB_API_TOKEN
            } else {
                throw new ApiError({
                    errorCode: MissingJupyterHubToken,
                    message:
                        'Impact client instantiation failed: Missing JupyterHub token.',
                })
            }
        }

        if (jupyterHubUserPath) {
            this.jhUserPath =
                jupyterHubUserPath +
                (jupyterHubUserPath.endsWith('/') ? '' : '/')
        }

        this.configureAxios()
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
        serverAddress?: string
    }) {
        return new Api({
            impactApiKey,
            jupyterHubToken,
            jupyterHubUserPath,
            serverAddress,
        })
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
        serverAddress?: string
    }) {
        return new Api({
            impactToken,
            jupyterHubToken,
            jupyterHubUserPath,
            serverAddress,
        })
    }

    private isConfiguredForNode = () => !!this.axiosConfig.jar

    private isConfiguredForImpact = () =>
        !!this.axiosConfig.headers['Impact-Authorization']

    private getNodeCookieJar = () => this.axiosConfig.jar

    private ensureAxiosConfig = async () => {
        if (isNode()) {
            if (
                !this.isConfiguredForNode() ||
                (this.impactToken && !this.isConfiguredForImpact())
            ) {
                const AxiosCookieSupport = await importModule(
                    'axios-cookiejar-support'
                )
                const ToughCookie = await importModule('tough-cookie')

                const jar = new ToughCookie.CookieJar(
                    new ToughCookie.MemoryCookieStore(),
                    {
                        allowSpecialUseDomain: true,
                        rejectPublicSuffixes: false,
                    }
                )
                const headers: Record<string, string> = {
                    Authorization: `token ${this.jhToken}`,
                }
                if (this.impactToken) {
                    headers[
                        'Impact-Authorization'
                    ] = `Bearer ${this.impactToken}`
                }

                this.axiosConfig = { headers, jar }

                this.axios = AxiosCookieSupport.wrapper(
                    Axios.create(this.axiosConfig)
                )
            }
        } else {
            if (this.impactToken && !this.isConfiguredForImpact()) {
                const headers: Record<string, string> = {
                    Authorization: `token ${this.jhToken}`,
                    'Impact-Authorization': `Bearer ${this.impactToken}`,
                }
                this.axiosConfig = { headers }
                this.axios = Axios.create(this.axiosConfig)
            }
        }
    }

    private ensureJhUserPath = async () => {
        if (this.jhUserPath) {
            return
        }
        try {
            const response = await this.axios.get(
                `${this.baseUrl}/hub/api/authorizations/token/${this.jhToken}`
            )
            const { server } = response.data
            if (server === null) {
                throw new ApiError({
                    errorCode: ServerNotStarted,
                    message: 'Server not started on JupyterHub.',
                })
            }
            if (server === undefined) {
                // Server missing in token scope, probably executing inside JupyterHub.
                // Fallback is to look for the JUPYTERHUB_SERVICE_PREFIX env variable
                this.jhUserPath =
                    typeof process !== 'undefined'
                        ? process.env?.JUPYTERHUB_SERVICE_PREFIX
                        : undefined
            } else {
                this.jhUserPath = server
            }
        } catch (e) {
            if (e instanceof AxiosError) {
                throw new ApiError({
                    errorCode: JhTokenError,
                    httpCode: e.response?.status,
                    message:
                        'Failed to authorize with JupyterHub, invalid token?',
                })
            }
            throw e
        }
    }

    private ensureImpactToken = async () => {
        await this.ensureAxiosConfig()
        await this.ensureJhUserPath()

        if (this.impactToken) {
            return
        }

        await this.axios.post(
            `${this.baseUrl}${this.jhUserPath}impact/api/login`,
            { secretKey: this.impactApiKey }
        )
        // extract cookie value, set cookie
        const nodeCookieJar = this.getNodeCookieJar()
        if (nodeCookieJar) {
            // Get cookie value from cookiejar
            const cookies = await nodeCookieJar.getCookies(
                `${this.baseUrl}${this.jhUserPath}`
            )
            this.impactToken = getValueFromJarCookies('access_token', cookies)
        } else {
            this.impactToken = getCookieValue('access_token')
        }
        // Update axios config with the acquired impactToken
        await this.ensureAxiosConfig()
    }

    getWorkspaces = async (): Promise<Workspace[]> => {
        return new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces`
                        )
                        .then((result) =>
                            resolve(
                                result.data.data.items.map(
                                    (workspace: WorkspaceProtocol) =>
                                        new Workspace({
                                            api: this,
                                            definition: workspace.definition,
                                            id: workspace.id,
                                        })
                                )
                            )
                        )

                        //.then((response) => resolve(response.data?.data?.items))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })
    }

    createExperiment = async ({
        modelicaExperimentDefinition,
        workspaceId,
    }: {
        modelicaExperimentDefinition: ModelicaExperimentDefinition
        workspaceId: WorkspaceId
    }): Promise<ExperimentId> =>
        new Promise((resolve, reject) =>
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .post(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments`,
                            {
                                experiment: modelicaExperimentDefinition,
                            }
                        )
                        .then((response) =>
                            resolve(response.data.experiment_id)
                        )
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        )

    cancelExperiment = async ({
        experimentId,
        workspaceId,
    }: {
        experimentId: ExperimentId
        workspaceId: WorkspaceId
    }): Promise<void> =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .delete(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments/${experimentId}/execution`
                        )
                        .then(() => resolve())
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    createWorkspace = async ({
        description,
        name,
    }: {
        description?: string
        name: string
    }): Promise<Workspace> =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .post(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces`,
                            {
                                new: {
                                    description,
                                    name,
                                },
                            }
                        )
                        .then((response) =>
                            resolve(
                                new Workspace({
                                    api: this,
                                    definition: response.data.definition,
                                    id: response.data.id,
                                })
                            )
                        )
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    deleteWorkspace = async (workspaceId: WorkspaceId): Promise<void> =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .delete(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}`
                        )
                        .then(() => resolve())
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    runExperiment = async ({
        cases,
        experimentId,
        workspaceId,
    }: {
        cases: CaseId[]
        experimentId: ExperimentId
        workspaceId: WorkspaceId
    }): Promise<void> =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() =>
                    this.axios
                        .post(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments/${experimentId}/execution`,
                            {
                                includeCases: {
                                    ids: cases,
                                },
                                options: {
                                    forceCompilation: true,
                                },
                            }
                        )
                        .then(() => resolve())
                        .catch((e) => reject(toApiError(e)))
                )
                .catch((e) => reject(toApiError(e)))
        })

    getExecutionStatus = async ({
        experimentId,
        workspaceId,
    }: {
        experimentId: ExperimentId
        workspaceId: WorkspaceId
    }): Promise<ExecutionStatusType> =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments/${experimentId}/execution`
                        )
                        .then((response) => resolve(response.data))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    getCustomFunctions = (
        workspaceId: WorkspaceId
    ): Promise<CustomFunction[]> =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/custom-functions`
                        )
                        .then((response) => resolve(response.data.data.items))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    getExperiment = ({
        experimentId,
        workspaceId,
    }: {
        experimentId: ExperimentId
        workspaceId: WorkspaceId
    }): Promise<ExperimentItem | undefined> =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments/${experimentId}`,
                            {
                                headers: {
                                    Accept: 'application/vnd.impact.experiment.v2+json',
                                },
                            }
                        )
                        .then((result) => resolve(result.data))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    getProjectExperiments = ({
        projectId,
        workspaceId,
    }: {
        projectId: ProjectId
        workspaceId: WorkspaceId
    }): Promise<ExperimentItem[]> =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/projects/${projectId}/experiments`,
                            {
                                headers: {
                                    Accept: 'application/vnd.impact.experiment.v2+json',
                                },
                            }
                        )
                        .then((result) => resolve(result.data.data.items))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    getWorkspaceExperiments = (
        workspaceId: WorkspaceId
    ): Promise<ExperimentItem[]> =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments`,
                            {
                                headers: {
                                    Accept: 'application/vnd.impact.experiment.v2+json',
                                },
                            }
                        )
                        .then((result) => resolve(result.data.data.items))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    getWorkspaceProjects = (workspaceId: WorkspaceId): Promise<Project[]> =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/projects`
                        )
                        .then((result) =>
                            resolve(
                                result.data.data.items.map(
                                    (project: LocalProjectProtocol) =>
                                        new Project({
                                            api: this,
                                            id: project.id,
                                            workspaceId,
                                        })
                                )
                            )
                        )
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    getCases = ({
        experimentId,
        workspaceId,
    }: {
        experimentId: ExperimentId
        workspaceId: WorkspaceId
    }): Promise<Case[] | undefined> =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments/${experimentId}/cases`
                        )
                        .then((response) => resolve(response.data?.data?.items))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    getExperimentTrajectories = ({
        experimentId,
        variableNames,
        workspaceId,
    }: {
        experimentId: ExperimentId
        variableNames: string[]
        workspaceId: WorkspaceId
    }): Promise<ExperimentTrajectories> =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .post(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments/${experimentId}/trajectories`,
                            { variable_names: variableNames },
                            {
                                headers: {
                                    Accept: 'application/vnd.impact.trajectories.v2+json',
                                },
                            }
                        )
                        .then((res) => resolve(res.data.data.items))
                })
                .catch((e) => reject(toApiError(e)))
        })

    getExperimentVariables = ({
        experimentId,
        workspaceId,
    }: {
        experimentId: ExperimentId
        workspaceId: WorkspaceId
    }): Promise<ExperimentVariables> =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments/${experimentId}/variables`
                        )
                        .then((res) => resolve(res.data))
                })
                .catch((e) => reject(toApiError(e)))
        })

    getCaseLog = ({
        caseId,
        experimentId,
        workspaceId,
    }: {
        caseId: CaseId
        experimentId: ExperimentId
        workspaceId: WorkspaceId
    }): Promise<string> =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments/${experimentId}/cases/${caseId}/log`
                        )
                        .then((res) => resolve(res.data))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    getCustomFunctionOptions = ({
        customFunction,
        workspaceId,
    }: {
        customFunction: string
        workspaceId: WorkspaceId
    }): Promise<CustomFunctionOptions> =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/custom-functions/${customFunction}/options`
                        )
                        .then((res) => resolve(res.data))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    getCaseTrajectories = ({
        caseId,
        experimentId,
        variableNames,
        workspaceId,
    }: {
        caseId: CaseId
        experimentId: ExperimentId
        variableNames: string[]
        workspaceId: WorkspaceId
    }): Promise<CaseTrajectories> =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .post(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments/${experimentId}/cases/${caseId}/trajectories`,
                            { variable_names: variableNames },
                            {
                                headers: {
                                    Accept: 'application/vnd.impact.trajectories.v2+json',
                                },
                            }
                        )
                        .then((res) => resolve(res.data.data.items))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    setImpactToken = (token: string) => {
        this.impactToken = token
        this.configureAxios()
    }

    delete = (path: string) =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .delete(
                            `${this.baseUrl}${this.jhUserPath}impact/api${path}`
                        )
                        .then((response) => resolve(response.data))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    get = (path: string, accept?: string) =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api${path}`,
                            accept
                                ? {
                                      headers: {
                                          Accept: accept,
                                      },
                                  }
                                : {}
                        )
                        .then((response) => resolve(response.data))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    post = (path: string, body: unknown, accept?: string) =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .post(
                            `${this.baseUrl}${this.jhUserPath}impact/api${path}`,
                            body,
                            accept
                                ? {
                                      headers: {
                                          Accept: accept,
                                      },
                                  }
                                : {}
                        )
                        .then((response) => resolve(response.data))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    put = (path: string, body: unknown, accept?: string) =>
        new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .put(
                            `${this.baseUrl}${this.jhUserPath}impact/api${path}`,
                            body,
                            accept
                                ? {
                                      headers: {
                                          Accept: accept,
                                      },
                                  }
                                : {}
                        )
                        .then((response) => resolve(response.data))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })
}

export default Api
