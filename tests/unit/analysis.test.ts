import Analysis from '../../src/analysis'
import TestDefinition from './test-definition.json'
import { ModelicaExperimentAnalysis } from '../../src/types'
import { test, expect } from 'vitest'

test('From complete ModelicaExperimentAnalysis and back should produce original complete ModelicaExperimentAnalysis', () => {
    const analysis = Analysis.fromModelicaExperimentAnalysis(
        TestDefinition.base.analysis as ModelicaExperimentAnalysis
    )

    expect(analysis.toModelicaExperimentAnalysis()).toEqual(
        TestDefinition.base.analysis
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
        parameters: { start_time: 0, final_time: 1 },
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
        parameters: { start_time: 0, final_time: 1 },
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
        parameters: { start_time: 0, final_time: 1 },
        simulationLogLevel: 'WARNING',
        simulationOptions: { dynamic_diagnostics: false, ncp: 500 },
        solverOptions: { key: 'customFunctionValue' },
        type: 'dynamic',
    })
})
