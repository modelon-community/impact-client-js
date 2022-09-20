import {
    ModelicaExperimentDefinition,
    ModelicaExperimentModifiers,
    ModelicaExperimentParameters,
} from './types'

export class ModelicaExperiment {
    customFunction: string
    modelName: string
    modifiers?: ModelicaExperimentModifiers
    parameters?: ModelicaExperimentParameters

    private constructor({
        customFunction,
        modelName,
        modifiers,
        parameters,
    }: {
        customFunction: string
        modelName: string
        modifiers?: ModelicaExperimentModifiers
        parameters?: ModelicaExperimentParameters
    }) {
        this.customFunction = customFunction
        this.modelName = modelName
        this.modifiers = modifiers
        this.parameters = parameters
    }

    static from({
        customFunction,
        modelName,
        modifiers,
        parameters,
    }: {
        customFunction: string
        modelName: string
        modifiers?: ModelicaExperimentModifiers
        parameters?: ModelicaExperimentParameters
    }): ModelicaExperiment {
        return new ModelicaExperiment({
            customFunction,
            modelName,
            modifiers,
            parameters,
        })
    }

    DefaultParameters = {
        start_time: 0,
        final_time: 1,
    }

    toDefinition(): ModelicaExperimentDefinition {
        return {
            version: 2,
            base: {
                model: {
                    modelica: {
                        className: this.modelName,
                        compilerOptions: {
                            c_compiler: 'gcc',
                            generate_html_diagnostics: false,
                            include_protected_variables: false,
                        },
                        runtimeOptions: {},
                        compilerLogLevel: 'w',
                        fmiTarget: 'me',
                        fmiVersion: '2.0',
                        platform: 'auto',
                    },
                },
                analysis: {
                    type: this.customFunction,
                    parameters: this.parameters || this.DefaultParameters,
                    simulationOptions: {
                        ncp: 500,
                        dynamic_diagnostics: false,
                    },
                    solverOptions: { rtol: '1e-6' },
                    simulationLogLevel: 'WARNING',
                },
                modifiers: this.modifiers || {},
            },
        }
    }
}
