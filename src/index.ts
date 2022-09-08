import Axios, { AxiosInstance } from 'axios'
import { Cookie, CookieJar } from 'tough-cookie'
import { getExperimentDefinition } from './experiment'

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

export interface Progress {
    message: string
    percentage: number
    done: boolean
    stage: string
}

export interface CompilationStatus {
    finished_executions: number
    total_executions: number
    status: string
    progresses: Progress[]
}

export interface Workspace {
    id: string
    definition: { name: string }
}

export interface CustomFunctionParameter {
    name: string
    type: string
    description: string
    defaultValue: string | boolean | number
}

export interface CustomFunction {
    version: string
    name: string
    description: string
    parameters: CustomFunctionParameter[]
    can_initialize_from: boolean
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
    }: {
        impactApiKey?: string
        impactToken?: string
        jupyterHubToken: string
        serverAddress: string
    }) {
        this.baseUrl = serverAddress
        this.impactApiKey = impactApiKey
        this.impactToken = impactToken

        if (!jupyterHubToken) {
            throw new Error(
                'Impact client instantiation failed: The jupyterHubToken parameter is mandatory'
            )
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
        serverAddress,
    }: {
        impactApiKey: string
        jupyterHubToken: string
        serverAddress: string
    }) {
        return new Client({
            impactApiKey,
            jupyterHubToken,
            serverAddress,
        })
    }

    static fromImpactToken({
        impactToken,
        jupyterHubToken,
        serverAddress,
    }: {
        impactToken: string
        jupyterHubToken: string
        serverAddress: string
    }) {
        return new Client({
            impactToken,
            jupyterHubToken,
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

        try {
            const response = await this.axios.get(
                `${this.baseUrl}/hub/api/authorizations/token/${this.jhToken}`
            )
            const { server } = response.data
            if (!server) {
                throw new Error('Server not started on JH')
            }
            this.jhUserPath = server
        } catch (e) {
            throw e
        }
    }

    private async ensureImpactToken() {
        await this.ensureAxiosConfig()
        await this.ensureJhUserPath()

        if (this.impactToken) {
            return
        }

        try {
            await this.axios.post(
                `${this.baseUrl}${this.jhUserPath}/impact/api/login`,
                { secretKey: this.impactApiKey }
            )
            // extract cookie value, set cookie
            const nodeCookieJar = this.getNodeCookieJar()
            if (nodeCookieJar) {
                // Get cookie value from cookiejar
                const cookies = await nodeCookieJar.getCookies(
                    `${this.baseUrl}${this.jhUserPath}`
                )
                this.impactToken = getValueFromJarCookies(
                    'access_token',
                    cookies
                )
            } else {
                this.impactToken = getCookieValue('access_token')
            }
            // Update axios config with the acquired impactToken
            await this.ensureAxiosConfig()
        } catch (e) {
            // Reject with our API error, with chaining
            throw e
        }
    }

    getWorkspaces(): Promise<Workspace[]> {
        return new Promise(async (resolve, reject) => {
            try {
                await this.ensureImpactToken()

                const response = await this.axios.get(
                    `${this.baseUrl}${this.jhUserPath}impact/api/workspaces`
                )
                resolve(response.data.data.items)
            } catch (e) {
                reject(e)
            }
        })
    }

    private createExperiment({
        modelName,
        workspaceId,
    }: {
        modelName: string
        workspaceId: string
    }): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                await this.ensureImpactToken()

                const response = await this.axios.post(
                    `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments`,
                    getExperimentDefinition(modelName)
                )
                resolve(response.data.experiment_id)
            } catch (e) {
                reject(e)
            }
        })
    }

    private runExperiment({
        experimentId,
        workspaceId,
    }: {
        experimentId: string
        workspaceId: string
    }): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                await this.ensureImpactToken()

                await this.axios.post(
                    `${this.baseUrl}${this.jhUserPath}/impact/api/workspaces/${workspaceId}/experiments/${experimentId}/execution`
                )
                resolve()
            } catch (e) {
                reject(e)
            }
        })
    }

    private getExecutionStatus({
        experimentId,
        workspaceId,
    }: {
        experimentId: string
        workspaceId: string
    }): Promise<CompilationStatus> {
        return new Promise(async (resolve, reject) => {
            try {
                await this.ensureImpactToken()

                const response = await this.axios.get(
                    `${this.baseUrl}${this.jhUserPath}/impact/api/workspaces/${workspaceId}/experiments/${experimentId}/execution`
                )
                resolve(response.data)
            } catch (e) {
                reject(e)
            }
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
        modelName,
        workspaceId,
    }: {
        modelName: string
        workspaceId: string
    }): Promise<string> {
        const experimentId = await this.createExperiment({
            modelName,
            workspaceId,
        })
        await this.runExperiment({
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
        return new Promise(async (resolve, reject) => {
            try {
                await this.ensureImpactToken()

                const response = await this.axios.get(
                    `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/custom-functions`
                )
                resolve(response.data.data.items)
            } catch (e) {
                reject(e)
            }
        })
    }

    getTrajectories({
        experimentId,
        variableNames,
        workspaceId,
    }: {
        experimentId: string
        variableNames: string[]
        workspaceId: string
    }): Promise<number[]> {
        return new Promise(async (resolve, reject) => {
            try {
                await this.ensureImpactToken()

                const response = await this.axios.post(
                    `${this.baseUrl}${this.jhUserPath}impact/api/workspaces/${workspaceId}/experiments/${experimentId}/cases/case_1/trajectories`,
                    { variable_names: variableNames }
                )
                resolve(response.data[0])
            } catch (e) {
                reject(e)
            }
        })
    }
}
