import {
    ModelicaExperimentDefinition,
    ModelicaExperimentExtensions,
    ModelicaExperimentModifiers,
    ModelicaExperimentParameters,
} from './types'

export class ModelicaExperiment {
    customFunction: string
    extensions?: ModelicaExperimentExtensions
    modelName: string
    modifiers?: ModelicaExperimentModifiers
    parameters?: ModelicaExperimentParameters

    private constructor({
        customFunction,
        extensions,
        modelName,
        modifiers,
        parameters,
    }: {
        customFunction: string
        extensions?: ModelicaExperimentExtensions
        modelName: string
        modifiers?: ModelicaExperimentModifiers
        parameters?: ModelicaExperimentParameters
    }) {
        this.customFunction = customFunction
        this.extensions = extensions
        this.modelName = modelName
        this.modifiers = modifiers
        this.parameters = parameters
    }

    static from({
        customFunction,
        extensions,
        modelName,
        modifiers,
        parameters,
    }: {
        customFunction: string
        extensions?: ModelicaExperimentExtensions
        modelName: string
        modifiers?: ModelicaExperimentModifiers
        parameters?: ModelicaExperimentParameters
    }): ModelicaExperiment {
        return new ModelicaExperiment({
            customFunction,
            extensions,
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
                        compilerLogLevel: 'warning',
                        fmiTarget: 'me',
                        fmiVersion: '2.0',
                        platform: 'auto',
                    },
                },
                analysis: {
                    type: this.customFunction,
                    parameters: this.parameters || this.DefaultParameters,
                    simulationOptions: {
                        ncp: 100,
                        dynamic_diagnostics: false,
                    },
                    solverOptions: {},
                    simulationLogLevel: 'WARNING',
                },
                modifiers: this.modifiers || {},
            },
            extensions: this.extensions || [],
        }
    }
}
