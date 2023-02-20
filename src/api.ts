import Axios, { AxiosError, AxiosInstance } from 'axios'
import ApiError, {
    MissingAccessTokenCookie,
    MissingJupyterHubToken,
    ServerNotStarted,
} from './api-error'
import { Cookie, CookieJar } from 'tough-cookie'
import ExperimentDefinition from './experiment-definition'
import {
    Case,
    CaseId,
    CaseTrajectories,
    CustomFunction,
    ExecutionStatus,
    ExperimentId,
    ExperimentTrajectories,
    Workspace,
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

export const UnknownApiError = -1

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
    private axios: AxiosInstance
    private axiosConfig: AxiosConfig
    private baseUrl: string
    private impactApiKey?: string
    private impactToken?: string
    private jhToken: string
    private jhUserPath: string | undefined

    private constructor({
        impactApiKey,
        impactToken,
        jupyterHubToken,
        serverAddress,
        jupyterHubUserPath,
    }: {
        impactApiKey?: string
        impactToken?: string
        jupyterHubToken: string
        serverAddress: string
        jupyterHubUserPath?: string
    }) {
        this.baseUrl = serverAddress
        this.impactApiKey = impactApiKey
        this.impactToken = impactToken

        if (!jupyterHubToken) {
            throw new ApiError({
                errorCode: MissingJupyterHubToken,
                message:
                    'Impact client instantiation failed: The jupyterHubToken parameter is mandatory',
            })
        }

        if (jupyterHubUserPath) {
            this.jhUserPath =
                jupyterHubUserPath +
                (jupyterHubUserPath.endsWith('/') ? '' : '/')
        }

        this.jhToken = jupyterHubToken
        const headers: Record<string, string> = {
            Authorization: `token ${jupyterHubToken}`,
        }
        if (this.impactToken) {
            headers['Impact-Authorization'] = `Bearer ${impactToken}`
        }
        this.axiosConfig = { headers }
        this.axios = Axios.create(this.axiosConfig)
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
        jupyterHubToken: string
        jupyterHubUserPath?: string
        serverAddress: string
    }) {
        return new Api({
            impactToken,
            jupyterHubToken,
            jupyterHubUserPath,
            serverAddress,
        })
    }

    private isConfiguredForNode() {
        return !!this.axiosConfig.jar
    }

    private isConfiguredForImpact() {
        return !!this.axiosConfig.headers['Impact-Authorization']
    }

    private getNodeCookieJar() {
        return this.axiosConfig.jar
    }

    private async ensureAxiosConfig() {
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

    private async ensureJhUserPath() {
        if (this.jhUserPath) {
            return
        }
        const response = await this.axios.get(
            `${this.baseUrl}/hub/api/authorizations/token/${this.jhToken}`
        )
        const { server } = response.data
        if (!server) {
            throw new ApiError({
                errorCode: ServerNotStarted,
                message: 'Server not started on JH or missing JH token scope.',
            })
        }
        this.jhUserPath = server
    }

    private async ensureImpactToken() {
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

    getWorkspaces(): Promise<Workspace[]> {
        return new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces`
                        )
                        .then((response) => resolve(response.data?.data?.items))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })
    }

    createExperiment({
        experimentDefinition,
        workspaceId,
    }: {
        experimentDefinition: ExperimentDefinition
        workspaceId: WorkspaceId
    }): Promise<ExperimentId> {
        return new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .post(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments`,
                            {
                                experiment:
                                    experimentDefinition.toModelicaExperimentDefinition(),
                            }
                        )
                        .then((response) =>
                            resolve(response.data.experiment_id)
                        )
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })
    }

    createWorkspace({
        description,
        name,
    }: {
        description?: string
        name: string
    }): Promise<WorkspaceId> {
        return new Promise((resolve, reject) => {
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
                        .then((response) => resolve(response.data.id))
                        .catch((e) => reject(toApiError(e)))
                })
                .catch((e) => reject(toApiError(e)))
        })
    }

    deleteWorkspace(workspaceId: WorkspaceId): Promise<void> {
        return new Promise((resolve, reject) => {
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
    }

    runExperiment({
        cases,
        experimentId,
        workspaceId,
    }: {
        cases: CaseId[]
        experimentId: ExperimentId
        workspaceId: WorkspaceId
    }): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
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
                })
                .catch((e) => reject(toApiError(e)))
        })
    }

    getExecutionStatus({
        experimentId,
        workspaceId,
    }: {
        experimentId: ExperimentId
        workspaceId: WorkspaceId
    }): Promise<ExecutionStatus> {
        return new Promise((resolve, reject) => {
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
    }

    getCustomFunctions(workspaceId: WorkspaceId): Promise<CustomFunction[]> {
        return new Promise((resolve, reject) => {
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
    }

    getCases({
        experimentId,
        workspaceId,
    }: {
        experimentId: ExperimentId
        workspaceId: WorkspaceId
    }): Promise<Case[] | undefined> {
        return new Promise((resolve, reject) => {
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
    }

    getExperimentTrajectories({
        experimentId,
        variableNames,
        workspaceId,
    }: {
        experimentId: ExperimentId
        variableNames: string[]
        workspaceId: WorkspaceId
    }): Promise<ExperimentTrajectories> {
        return new Promise((resolve, reject) => {
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
    }

    getCaseLog({
        caseId,
        experimentId,
        workspaceId,
    }: {
        caseId: CaseId
        experimentId: ExperimentId
        workspaceId: WorkspaceId
    }): Promise<string> {
        return new Promise((resolve, reject) => {
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
    }

    getCaseTrajectories({
        caseId,
        experimentId,
        variableNames,
        workspaceId,
    }: {
        caseId: CaseId
        experimentId: ExperimentId
        variableNames: string[]
        workspaceId: WorkspaceId
    }): Promise<CaseTrajectories> {
        return new Promise((resolve, reject) => {
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
    }
}

export default Api
