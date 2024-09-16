import { X2jOptions, XMLParser } from 'fast-xml-parser'
import DefaultExperiment from '../default-experiment'
import { Variable } from '../types'
import { ModelDescriptionDefs } from './model-description.types'
import { SimpleType } from './simple-type'

export class ModelDescription {
    private data: ModelDescriptionDefs.Raw.ModelDescription

    constructor(data: ModelDescriptionDefs.Raw.ModelDescription) {
        this.data = data
    }

    static fromXML(modelDescriptionXML: string) {
        const options: X2jOptions = {
            attributeNamePrefix: '',
            ignoreAttributes: false,
            isArray: (tagName, path) => {
                return [
                    'fmiModelDescription.ModelVariables.ScalarVariable',
                    'fmiModelDescription.TypeDefinitions.SimpleType',
                    'fmiModelDescription.ModelStructure.InitialUnknowns.Unknown',
                    'fmiModelDescription.ModelStructure.Derivatives.Unknown',
                    'fmiModelDescription.LogCategories.Category',
                    'fmiModelDescription.UnitDefinitions.Unit',
                ].includes(path)
            },
        }
        const parser = new XMLParser(options)
        const modelDescriptionJSON = parser.parse(modelDescriptionXML)
        return new ModelDescription(modelDescriptionJSON.fmiModelDescription)
    }

    getDefaultExperiment() {
        const defaultExperiment = this.data.DefaultExperiment

        const toFloatOrUndefined = (key: string, obj: Record<string, string>) =>
            obj[key] ? parseFloat(obj[key]) : undefined

        const parameters: ConstructorParameters<typeof DefaultExperiment>[0] =
            {}

        const defaultExperimentKeys = [
            'startTime',
            'stepSize',
            'stopTime',
            'tolerance',
        ] as const

        type DefaultExperimentKey = (typeof defaultExperimentKeys)[number]

        defaultExperimentKeys.forEach((key) => {
            parameters[key as DefaultExperimentKey] = toFloatOrUndefined(
                key,
                defaultExperiment
            )
        })

        return new DefaultExperiment(parameters)
    }

    getTypeDefinitions(): ModelDescriptionDefs.Transformed.Type[] {
        if (!this.data.TypeDefinitions?.SimpleType) {
            return []
        }

        return this.data.TypeDefinitions.SimpleType.map((s) =>
            new SimpleType(s).getTransformed()
        )
    }

    getModelName() {
        return this.data.modelName
    }

    getUnits() {
        return this.data.UnitDefinitions.Unit
    }

    getVariables(): Variable[] {
        return this.data.ModelVariables.ScalarVariable
    }
}

export default ModelDescription
