import { ExperimentDefinition } from './types'

const getExperimentDefinition = (className: string): ExperimentDefinition => ({
    version: 2,
    base: {
        model: {
            modelica: {
                className,
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
            type: 'dynamic',
            parameters: { start_time: 0, final_time: 4 },
            simulationOptions: {
                ncp: 500,
                dynamic_diagnostics: false,
            },
            solverOptions: { rtol: '1e-6' },
            simulationLogLevel: 'WARNING',
        },
        modifiers: { variables: {} },
    },
})

export class ModelicaExperimentDefinition {
    private customFunction: string
    private experimentDefinition: ExperimentDefinition
    private model: string

    private constructor({
        customFunction,
        experimentDefinition,
        model,
    }: {
        customFunction: string
        experimentDefinition: ExperimentDefinition
        model: string
    }) {
        this.customFunction = customFunction
        this.experimentDefinition = experimentDefinition
        this.model = model
    }

    static from({
        customFunction,
        model,
    }: {
        customFunction: string
        model: string
    }): ModelicaExperimentDefinition {
        const experimentDefinition = getExperimentDefinition(model)

        return new ModelicaExperimentDefinition({
            customFunction,
            experimentDefinition,
            model,
        })
    }
}
