import Analysis from './analysis'
import Api from './api'
import DefaultExperiment from './default-experiment'
import ExperimentDefinition from './experiment-definition'
import ModelDescription from './model-description'
import { XMLParser } from 'fast-xml-parser'
import Model from './model'
import { FmuId, ModelExecutableInfo, WorkspaceId } from './types'

class ModelExecutable {
    private api: Api
    private info?: ModelExecutableInfo
    fmuId: FmuId
    private modelDescription?: ModelDescription
    private workspaceId: WorkspaceId

    private constructor({
        api,
        fmuId,
        info,
        modelDescription,
        workspaceId,
    }: {
        api: Api
        fmuId: FmuId
        info?: ModelExecutableInfo
        modelDescription?: ModelDescription
        workspaceId: WorkspaceId
    }) {
        this.api = api
        this.fmuId = fmuId
        if (info) {
            this.info = info
        }
        if (modelDescription) {
            this.modelDescription = modelDescription
        }
        this.workspaceId = workspaceId
    }

    async createExperimentDefinition(analysis: Analysis) {
        if (!this.modelDescription) {
            this.modelDescription = await this.downloadModelDescription()
        }
        return ExperimentDefinition.from({
            analysis,
            model: Model.from({
                className: this.modelDescription.getModelName(),
            }),
        })
    }

    private async downloadModelDescription(): Promise<ModelDescription> {
        const modelDescriptionXML = await this.api.getModelDescription({
            fmuId: this.fmuId,
            workspaceId: this.workspaceId,
        })

        const options = {
            attributeNamePrefix: '',
            ignoreAttributes: false,
        }
        const parser = new XMLParser(options)

        const modelDescriptionJSON = parser.parse(modelDescriptionXML)

        return new ModelDescription(modelDescriptionJSON.fmiModelDescription)
    }

    async getModelDescription() {
        if (!this.modelDescription) {
            this.modelDescription = await this.downloadModelDescription()
        }
        return this.modelDescription
    }

    async getModelExecutableInfo() {
        if (!this.info) {
            this.info = await this.api.getModelExecutableInfo({
                fmuId: this.fmuId,
                workspaceId: this.workspaceId,
            })
        }

        return this.info
    }

    static from({
        api,
        fmuId,
        workspaceId,
    }: {
        api: Api
        fmuId: FmuId
        workspaceId: WorkspaceId
    }) {
        return new ModelExecutable({
            api,
            fmuId,
            workspaceId,
        })
    }
}

export default ModelExecutable
