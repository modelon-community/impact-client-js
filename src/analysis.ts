import {
    CustomFunctionOptions,
    ModelicaExperimentAnalysis,
    ModelicaExperimentAnalysisParameters,
    ModelicaExperimentSimulationLogLevel,
    ModelicaExperimentSimulationOptions,
    ModelicaExperimentSolverOptions,
} from './types'

class Analysis {
    customFunctionOptions?: CustomFunctionOptions
    parameters?: ModelicaExperimentAnalysisParameters
    simulationOptions: ModelicaExperimentSimulationOptions
    solverOptions: ModelicaExperimentSolverOptions
    simulationLogLevel?: ModelicaExperimentSimulationLogLevel
    type: string

    static DefaultAnalysis = {
        type: 'dynamic',
        parameters: {
            start_time: 0,
            final_time: 1,
        },
        simulationOptions: {
            ncp: 100,
            dynamic_diagnostics: false,
        },
        solverOptions: {},
        simulationLogLevel: 'WARNING' as ModelicaExperimentSimulationLogLevel,
    }

    private constructor({
        customFunctionOptions,
        parameters,
        simulationOptions,
        solverOptions,
        simulationLogLevel,
        type,
    }: {
        customFunctionOptions?: CustomFunctionOptions
        parameters?: ModelicaExperimentAnalysisParameters
        simulationLogLevel?: ModelicaExperimentSimulationLogLevel
        simulationOptions?: ModelicaExperimentSimulationOptions
        solverOptions?: ModelicaExperimentSolverOptions
        type: string
    }) {
        this.customFunctionOptions = customFunctionOptions
        this.parameters = parameters
        this.simulationOptions = simulationOptions
        this.solverOptions = solverOptions
        this.simulationLogLevel = simulationLogLevel
        this.type = type
    }
    static from({
        customFunctionOptions,
        parameters,
        simulationOptions,
        solverOptions,
        simulationLogLevel,
        type,
    }: {
        customFunctionOptions?: CustomFunctionOptions
        parameters?: ModelicaExperimentAnalysisParameters
        simulationLogLevel?: ModelicaExperimentSimulationLogLevel
        simulationOptions?: ModelicaExperimentSimulationOptions
        solverOptions?: ModelicaExperimentSolverOptions
        type: string
    }) {
        return new Analysis({
            customFunctionOptions,
            parameters,
            simulationOptions,
            solverOptions,
            simulationLogLevel,
            type,
        })
    }

    static fromModelicaExperimentAnalysis = (
        analysisDefinition: ModelicaExperimentAnalysis
    ) =>
        new Analysis({
            customFunctionOptions: undefined,
            parameters: analysisDefinition.parameters,
            simulationOptions: analysisDefinition.simulationOptions,
            solverOptions: analysisDefinition.solverOptions,
            simulationLogLevel: analysisDefinition.simulationLogLevel,
            type: analysisDefinition.type,
        })

    toModelicaExperimentAnalysis = (): ModelicaExperimentAnalysis => {
        // Use default analysis structure as basis
        const analysisDefinition = {
            type: this.type,
            parameters: {
                ...Analysis.DefaultAnalysis.parameters,
            },
            simulationOptions: {
                ...Analysis.DefaultAnalysis.simulationOptions,
            },
            solverOptions: {
                ...Analysis.DefaultAnalysis.solverOptions,
            },
            simulationLogLevel: Analysis.DefaultAnalysis.simulationLogLevel,
        }

        // Apply custom function options if provided
        if (this.customFunctionOptions?.options?.simulation) {
            analysisDefinition.simulationOptions = Object.assign(
                analysisDefinition.simulationOptions,
                this.customFunctionOptions.options.simulation
            )
        }
        if (this.customFunctionOptions?.options?.solver) {
            analysisDefinition.solverOptions = Object.assign(
                analysisDefinition.solverOptions,
                this.customFunctionOptions.options.solver
            )
        }
        // Apply any user provided options if provided
        if (this.parameters) {
            analysisDefinition.parameters = Object.assign(
                analysisDefinition.parameters,
                this.parameters
            )
        }

        if (this.simulationOptions) {
            analysisDefinition.simulationOptions = Object.assign(
                analysisDefinition.simulationOptions,
                this.simulationOptions
            )
        }
        if (this.solverOptions) {
            analysisDefinition.solverOptions = Object.assign(
                analysisDefinition.solverOptions,
                this.solverOptions
            )
        }

        if (this.simulationLogLevel) {
            analysisDefinition.simulationLogLevel = this.simulationLogLevel
        }

        return analysisDefinition
    }
}

export default Analysis
