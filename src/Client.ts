import Axios, { AxiosInstance } from 'axios'
import { Cookie, CookieJar } from 'tough-cookie'
import { ModelicaExperiment } from './ModelicaExperiment'
import {
    Case,
    CaseTrajectories,
    CustomFunction,
    ExecutionStatus,
    ExperimentId,
    ExperimentTrajectories,
    Workspace,
} from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importModule(moduleName: string): Promise<any> {
    return await import(moduleName)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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
        throw new Error('Access token cookie not found')
    }
    return cookie.value
}

export class Client {
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
            throw new Error(
                'Impact client instantiation failed: The jupyterHubToken parameter is mandatory'
            )
        }

        if (jupyterHubUserPath) {
            this.jhUserPath = jupyterHubUserPath + (jupyterHubUserPath.endsWith('/') ? '' : '/')
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
        return new Client({
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
        return new Client({
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
            throw new Error(
                'Server not started on JH or missing JH token scope.'
            )
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
                        .catch((e) => reject(e))
                })
                .catch((e) => reject(e))
        })
    }

    private setupExperiment({
        experiment,
        workspaceId,
    }: {
        experiment: ModelicaExperiment
        workspaceId: string
    }): Promise<ExperimentId> {
        return new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .post(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments`,
                            { experiment: experiment.toDefinition() }
                        )
                        .then((response) =>
                            resolve(response.data.experiment_id)
                        )
                        .catch((e) => reject(e))
                })
                .catch((e) => reject(e))
        })
    }

    private runExperiment({
        cases,
        experimentId,
        workspaceId,
    }: {
        cases: string[]
        experimentId: string
        workspaceId: string
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
                        .catch((e) => reject(e))
                })
                .catch((e) => reject(e))
        })
    }

    getExecutionStatus({
        experimentId,
        workspaceId,
    }: {
        experimentId: string
        workspaceId: string
    }): Promise<ExecutionStatus> {
        return new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments/${experimentId}/execution`
                        )
                        .then((response) => resolve(response.data))
                        .catch((e) => reject(e))
                })
                .catch((e) => reject(e))
        })
    }

    private async executionSuccess({
        experimentId,
        workspaceId,
    }: {
        experimentId: string
        workspaceId: string
    }) {
        let data = await this.getExecutionStatus({
            experimentId,
            workspaceId,
        })
        while (data.status !== 'done') {
            await sleep(1000)
            data = await this.getExecutionStatus({
                experimentId,
                workspaceId,
            })
        }
    }

    async executeExperiment({
        caseIds,
        experiment,
        workspaceId,
    }: {
        caseIds: string[]
        experiment: ModelicaExperiment
        workspaceId: string
    }): Promise<ExperimentId> {
        const experimentId = await this.setupExperiment({
            experiment,
            workspaceId,
        })

        await this.runExperiment({
            cases: caseIds,
            experimentId,
            workspaceId,
        })

        return experimentId
    }

    async executeExperimentSync({
        caseIds,
        experiment,
        workspaceId,
    }: {
        caseIds: string[]
        experiment: ModelicaExperiment
        workspaceId: string
    }): Promise<ExperimentId> {
        const experimentId = await this.setupExperiment({
            experiment,
            workspaceId,
        })

        await this.runExperiment({
            cases: caseIds,
            experimentId,
            workspaceId,
        })

        await this.executionSuccess({
            experimentId,
            workspaceId,
        })

        return experimentId
    }

    getCustomFunctions(workspaceId: string): Promise<CustomFunction[]> {
        return new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/custom-functions`
                        )
                        .then((response) => resolve(response.data.data.items))
                        .catch((e) => reject(e))
                })
                .catch((e) => reject(e))
        })
    }

    getCases({
        experimentId,
        workspaceId,
    }: {
        experimentId: string
        workspaceId: string
    }): Promise<Case[] | undefined> {
        return new Promise((resolve, reject) => {
            this.ensureImpactToken()
                .then(() => {
                    this.axios
                        .get(
                            `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments/${experimentId}/cases`
                        )
                        .then((response) => resolve(response.data?.data?.items))
                        .catch((e) => reject(e))
                })
                .catch((e) => reject(e))
        })
    }

    getExperimentTrajectories({
        experimentId,
        variableNames,
        workspaceId,
    }: {
        experimentId: string
        variableNames: string[]
        workspaceId: string
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
                .catch((e) => reject(e))
        })
    }

    getCaseTrajectories({
        caseId,
        experimentId,
        variableNames,
        workspaceId,
    }: {
        caseId: string
        experimentId: string
        variableNames: string[]
        workspaceId: string
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
                        .catch((e) => reject(e))
                })
                .catch((e) => reject(e))
        })
    }
}
