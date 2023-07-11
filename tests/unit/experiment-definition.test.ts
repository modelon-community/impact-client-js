import ExperimentDefinition from '../../src/experiment-definition'
import Analysis from '../../src/analysis'
import Model from '../../src/model'
import TestDefinition from './test-definition.json'
import { ModelicaModel, ModelicaExperimentDefinition } from '../../src/types'

test('Create experiment definition without modifiers and parameters', () => {
    const customFunction = 'dynamic'
    const modelName = 'Modelica.Blocks.Examples.PID_Controller'
    const model = Model.from({ className: modelName })
    const analysis = Analysis.from({ type: customFunction })
    const modelExperiment = ExperimentDefinition.from({
        analysis,
        model,
    })

    expect(modelExperiment.toModelicaExperimentDefinition()).toEqual({
        version: 2,
        base: {
            model: {
                modelica: {
                    className: modelName,
                    compilerOptions: {
                        c_compiler: 'gcc',
                    },
                    compilerLogLevel: 'warning',
                    fmiTarget: 'me',
                    fmiVersion: '2.0',
                    runtimeOptions: {},
                    platform: 'auto',
                },
            },
            analysis: {
                type: customFunction,
                parameters: {
                    start_time: 0,
                    final_time: 1,
                },
                simulationOptions: {
                    ncp: 100,
                    dynamic_diagnostics: false,
                },
                solverOptions: {},
                simulationLogLevel: 'WARNING',
            },
            modifiers: {},
        },
        extensions: [],
    })
})

test('Create experiment definition with modifiers and parameters', () => {
    const customFunction = 'dynamic'
    const modelName = 'Modelica.Blocks.Examples.PID_Controller'
    const modifiers = { variables: { 'inertia1.J': 2, 'PI.k': 40 } }
    const extensions = [
        {
            modifiers: { variables: { 'inertia1.w': 1, 'inertia2.w': 2 } },
        },
        {
            modifiers: { variables: { 'inertia1.w': 2, 'inertia2.w': 3 } },
        },
    ]
    const model = Model.fromModelDefinition({
        modelica: {
            className: modelName,
            compilerLogLevel: 'warning',
            compilerOptions: {
                c_compiler: 'gcc',
                generate_html_diagnostics: false,
                include_protected_variables: false,
            },
            fmiTarget: 'me',
            fmiVersion: '2.0',
            platform: 'auto',
            runtimeOptions: {},
        },
    } as ModelicaModel)
    const analysis = Analysis.from({
        parameters: {
            start_time: 0,
            final_time: 4,
        },
        type: customFunction,
    })

    const modelExperiment = ExperimentDefinition.from({
        analysis,
        extensions,
        model,
        modifiers,
    })

    const expectedDefinition = { ...TestDefinition }
    expectedDefinition.base.modifiers = modifiers

    expect(modelExperiment.toModelicaExperimentDefinition()).toEqual(
        expectedDefinition
    )
})

test('From ModelicaExperimentDefinition and back should produce original ModelicaExperimentDefinition', () => {
    const modelExperiment =
        ExperimentDefinition.fromModelicaExperimentDefinition(
            TestDefinition as ModelicaExperimentDefinition
        )

    expect(modelExperiment.toModelicaExperimentDefinition()).toEqual(
        TestDefinition
    )
})

test('Validate that a ModelicaExperimentDefinition with explicit model options are not overwritten by customFunction options', () => {
    // Options such as compilerLogLevel, runtimeOptions, compilerOptions, platform, fmiVersion, fmiTarget
})

test('Validate that a ModelicaExperimentDefinition with customFunction options are not overwritten by DefaultRuntimeOptions, DefaultCompilerOptions', () => {
    // Options such as compilerLogLevel, runtimeOptions, compilerOptions, platform, fmiVersion, fmiTarget
})