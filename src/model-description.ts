import DefaultExperiment from './default-experiment'
import { Unit, Variable } from './types'

type ModelDescriptionData = {
    DefaultExperiment: Record<string, string>
    ModelVariables: {
        ScalarVariable: Variable[]
    }
    UnitDefinitions: { Unit: Unit[] }
    modelName: string
}

class ModelDescription {
    private data: ModelDescriptionData

    constructor(data: ModelDescriptionData) {
        this.data = data
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

        type DefaultExperimentKey = typeof defaultExperimentKeys[number]

        defaultExperimentKeys.forEach((key) => {
            parameters[key as DefaultExperimentKey] = toFloatOrUndefined(
                key,
                defaultExperiment
            )
        })

        return new DefaultExperiment(parameters)
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
