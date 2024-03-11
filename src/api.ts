import Axios, { AxiosError, AxiosInstance } from 'axios'
import ApiError, {
    JhTokenError,
    MissingAccessTokenCookie,
    ServerNotStarted,
    UnknownApiError,
} from './api-error'
import { Cookie, CookieJar, MemoryCookieStore } from 'tough-cookie'
import Project from './project'
import Workspace from './workspace'
import {
    Case,
    CaseId,
    CaseInput,
    CaseTrajectories,
    CustomFunction,
    CustomFunctionOptions,
    ExecutionStatusType,
    ExperimentId,
    ExperimentItem,
    ExperimentTrajectories,
    ExperimentVariables,
    FmuId,
    LocalProjectProtocol,
    ModelExecutableInfo,
    ModelicaExperimentDefinition,
    ProjectId,
    WorkspaceProtocol,
    WorkspaceId,
    ExecutionOptions,
} from './types'

import { wrapper as axiosCookieWrapper } from 'axios-cookiejar-support'

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
    private impactSession?: string
    private jhUserPath: string | undefined

    private configureAxios() {
        const headers: Record<string, string> = {};
        
        if (this.impactApiKey) {
            headers['impact-api-key'] = `${this.impactApiKey}`
        }

        this.axiosConfig = { headers }
        this.axios = Axios.create(this.axiosConfig)
    }

    private constructor({
        impactApiKey,
        serverAddress,
        jupyterHubUserPath,
    }: {
        impactApiKey?: string
        serverAddress?: string
        jupyterHubUserPath?: string
    }) {
        this.baseUrl = serverAddress || ''
        this.impactApiKey = impactApiKey

        if (typeof jupyterHubUserPath === 'string') {
            this.jhUserPath =
                jupyterHubUserPath +
                (jupyterHubUserPath.endsWith('/') ? '' : '/')
        }

        this.configureAxios()
    }

    static fromImpactApiKey({
        impactApiKey,
        jupyterHubUserPath,
        serverAddress,
    }: {
        impactApiKey?: string
        jupyterHubUserPath?: string
        serverAddress?: string
    }) {
        return new Api({
            impactApiKey,
            jupyterHubUserPath,
            serverAddress,
        })
    }

    static fromImpactSession({
        jupyterHubUserPath,
        serverAddress,
    }: {
        jupyterHubUserPath?: string
        serverAddress?: string
    }) {
        return new Api({
            jupyterHubUserPath,
            serverAddress,
        })
    }

    private isConfiguredForNode = () => !!this.axiosConfig.jar

    private apiKeySet = () =>
        !!this.axiosConfig.headers['impact-api-key'] 

    private hasImpactSession = () => !!getCookieValue("impact-session");

    private userPathFromUrl(url: string) {
        const regex = /\/user\/([^/]+)\//
        const match = url.match(regex)
        return match ? match[0] : undefined;
    }

    private getNodeCookieJar = () => this.axiosConfig.jar

    private ensureAxiosConfig = async () => {
        // If node - set api-key if available and cookies to accept cookies from localhost
        if (isNode()) {
            if (
                !this.isConfiguredForNode() ||
                (this.impactApiKey && !this.apiKeySet())
            ) {
                const jar = new CookieJar(new MemoryCookieStore(), {
                    allowSpecialUseDomain: true,
                    rejectPublicSuffixes: false,
                })
                const headers: Record<string, string> = {
                    'impact-api-key': `${this.impactApiKey}`,
                }
                
                this.axiosConfig = { headers, jar }

                this.axios = axiosCookieWrapper(Axios.create(this.axiosConfig))
            }
        } else {
            if (this.impactApiKey && !this.apiKeySet()) {
                const headers: Record<string, string> = {
                    'impact-api-key': `Bearer ${this.impactApiKey}`,
                }
                this.axiosConfig = { headers }
                this.axios = Axios.create(this.axiosConfig)
            }
        }
    }

    private ensureJhUserPath = async () => {
        // TODO: Requires api-key to be present at the moment
        if (this.jhUserPath) {
            return
        }
        try {
            if (this.apiKeySet()) {
                const response = await this.axios.get(
                    `${this.baseUrl}/hub/api/user`
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
                
                return 
            }

            // Use document URL as fallback.
            const userPathFromUrl = this.userPathFromUrl(document.URL);
            if (userPathFromUrl) {
                this.jhUserPath = userPathFromUrl;
                return
            } else {
                throw new Error('Failed to set user path from URL');
            }

        } catch (e) {
            if (e instanceof AxiosError) {
                throw new ApiError({
                    errorCode: JhTokenError,
                    httpCode: e.response?.status,
                    message:
                        'Failed to authorize with JupyterHub, invalid api key?',
                })
            }
            throw e
        }
    }

    private ensureImpactAuth = async () => {
        await this.ensureAxiosConfig()
        await this.ensureJhUserPath()

        if (this.impactApiKey || this.hasImpactSession()) {
            return
        } 

        throw new Error('No authentication method provided, please provide impact api key or make sure that impact-session token is present')
    }

    getWorkspaces = async (): Promise<Workspace[]> => {
        return new Promise((resolve, reject) => {
            this.ensureImpactAuth()
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
            this.ensureImpactAuth()
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
            this.ensureImpactAuth()
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
            this.ensureImpactAuth()
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
            this.ensureImpactAuth()
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
        options,
    }: {
        cases: CaseId[]
        experimentId: ExperimentId
        workspaceId: WorkspaceId
        options?: ExecutionOptions
    }): Promise<void> =>
        new Promise((resolve, reject) => {
            this.ensureImpactAuth()
                .then(() =>
                    this.axios
                        .post(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments/${experimentId}/execution`,
                            {
                                includeCases: {
                                    ids: cases,
                                },
                                options
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
            this.ensureImpactAuth()
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
            this.ensureImpactAuth()
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
            this.ensureImpactAuth()
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
            this.ensureImpactAuth()
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
            this.ensureImpactAuth()
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
            this.ensureImpactAuth()
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
            this.ensureImpactAuth()
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
            this.ensureImpactAuth()
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
            this.ensureImpactAuth()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments/${experimentId}/variables`
                        )
                        .then((res) => resolve(res.data))
                })
                .catch((e) => reject(toApiError(e)))
        })

    getCaseInput = ({
        caseId,
        experimentId,
        workspaceId,
    }: {
        caseId: CaseId
        experimentId: ExperimentId
        workspaceId: WorkspaceId
    }): Promise<CaseInput> =>
        new Promise((resolve, reject) => {
            this.ensureImpactAuth()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments/${experimentId}/cases/${caseId}`
                        )
                        .then((res) => resolve(res.data.input))
                        .catch((e) => reject(toApiError(e)))
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
            this.ensureImpactAuth()
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

    getModelDescription = ({
        fmuId,
        workspaceId,
    }: {
        fmuId: FmuId
        workspaceId: WorkspaceId
    }): Promise<string> =>
        new Promise((resolve, reject) => {
            this.ensureImpactAuth()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/model-executables/${fmuId}/model-description`
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
            this.ensureImpactAuth()
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
            this.ensureImpactAuth()
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

    getModelExecutableInfo = ({
        fmuId,
        workspaceId,
    }: {
        fmuId: FmuId
        workspaceId: WorkspaceId
    }): Promise<ModelExecutableInfo> =>
        new Promise((resolve, reject) => {
            this.ensureImpactAuth()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/model-executables/${fmuId}`
                        )
                        .then((response) => resolve(response.data))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    getModelExecutableInfos = (
        workspaceId: WorkspaceId
    ): Promise<ModelExecutableInfo[]> =>
        new Promise((resolve, reject) => {
            this.ensureImpactAuth()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/model-executables`
                        )
                        .then((response) => resolve(response.data?.data?.items))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })

    setImpactApiKey = (apiKey: string) => {
        this.impactApiKey = apiKey;
        this.configureAxios();
    }

    delete = (path: string) =>
        new Promise((resolve, reject) => {
            this.ensureImpactAuth()
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
            this.ensureImpactAuth()
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
            this.ensureImpactAuth()
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
            this.ensureImpactAuth()
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
