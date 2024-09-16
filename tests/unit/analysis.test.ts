import Analysis from '../../src/analysis'
import { test, expect } from 'vitest'
import { testDefinitionMockData } from '../mock-data/test-definition.mock-data'

test('From complete ModelicaExperimentAnalysis and back should produce original complete ModelicaExperimentAnalysis', () => {
    const analysis = Analysis.fromModelicaExperimentAnalysis(
        testDefinitionMockData.base.analysis
    )

    expect(analysis.toModelicaExperimentAnalysis()).toEqual(
        testDefinitionMockData.base.analysis
    )
})

test('Analysis with only custom function name and solver options should get default simulation options', () => {
    const analysis = Analysis.from({
        solverOptions: { key: 'value' },
        type: 'dynamic',
    })

    expect(analysis.toModelicaExperimentAnalysis()).toEqual({
        type: 'dynamic',
        solverOptions: { key: 'value' },
        simulationLogLevel: 'WARNING',
        simulationOptions: { dynamic_diagnostics: false, ncp: 100 },
        parameters: [
            { name: 'start_time', value: 0 },
            { name: 'final_time', value: 1 },
        ],
    })
})

test('Analysis with custom function options should not override explicitly set values', () => {
    const analysis = Analysis.from({
        customFunctionOptions: {
            compiler: {},
            runtime: {},
            simulation: { ncp: 500 },
            solver: { key: 'customFunctionValue' },
        },
        simulationOptions: { ncp: 250 },
        solverOptions: { key: 'explicitlySpecifiedValue' },
        type: 'dynamic',
    })

    expect(analysis.toModelicaExperimentAnalysis()).toEqual({
        parameters: [
            { name: 'start_time', value: 0 },
            { name: 'final_time', value: 1 },
        ],
        simulationLogLevel: 'WARNING',
        simulationOptions: { dynamic_diagnostics: false, ncp: 250 },
        solverOptions: { key: 'explicitlySpecifiedValue' },
        type: 'dynamic',
    })
})

test('Analysis with custom function options should override default values', () => {
    const analysis = Analysis.from({
        customFunctionOptions: {
            compiler: {},
            runtime: {},
            simulation: { ncp: 500 },
            solver: { key: 'customFunctionValue' },
        },
        type: 'dynamic',
    })

    expect(analysis.toModelicaExperimentAnalysis()).toEqual({
        parameters: [
            { name: 'start_time', value: 0 },
            { name: 'final_time', value: 1 },
        ],
        simulationLogLevel: 'WARNING',
        simulationOptions: { dynamic_diagnostics: false, ncp: 500 },
        solverOptions: { key: 'customFunctionValue' },
        type: 'dynamic',
    })
})
