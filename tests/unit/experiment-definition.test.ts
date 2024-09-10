import ExperimentDefinition from '../../src/experiment-definition'
import Analysis from '../../src/analysis'
import Model from '../../src/model'
import {
    ModelicaExperimentExtensions,
    ModelicaExperimentModifiers,
} from '../../src/types'
import { expect, test } from 'vitest'
import { components } from '../../src/schema/impact-api'
import { mockTestDefinition } from './mockTestDefinition'

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
        version: 3,
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
                parameters: [
                    {
                        name: 'start_time',
                        value: 0,
                    },
                    {
                        name: 'final_time',
                        value: 1,
                    },
                ],
                simulationOptions: {
                    ncp: 100,
                    dynamic_diagnostics: false,
                },
                solverOptions: {},
                simulationLogLevel: 'WARNING',
            },
        },
        extensions: [],
    })
})

test('Create experiment definition with modifiers and parameters', () => {
    const customFunction = 'dynamic'
    const modelName = 'Modelica.Blocks.Examples.PID_Controller'
    const modifiers: ModelicaExperimentModifiers = {
        variables: [
            { kind: 'value', name: 'inertia1.J', value: 2, dataType: 'REAL' },
            { kind: 'value', name: 'PI.k', value: 40, dataType: 'REAL' },
        ],
        initializeFrom: null,
        initializeFromCase: null,
        initializeFromExternalResult: null,
    }
    const extensions: ModelicaExperimentExtensions = [
        {
            modifiers: {
                variables: [
                    {
                        kind: 'value',
                        name: 'inertia1.w',
                        value: 1,
                        dataType: 'REAL',
                    },
                    {
                        kind: 'value',
                        name: 'inertia2.w',
                        value: 2,
                        dataType: 'REAL',
                    },
                ],
                initializeFrom: null,
                initializeFromCase: null,
                initializeFromExternalResult: null,
            },
        },
        {
            modifiers: {
                variables: [
                    {
                        kind: 'value',
                        name: 'inertia1.w',
                        value: 2,
                        dataType: 'REAL',
                    },
                    {
                        kind: 'value',
                        name: 'inertia2.w',
                        value: 3,
                        dataType: 'REAL',
                    },
                ],
                initializeFrom: null,
                initializeFromCase: null,
                initializeFromExternalResult: null,
            },
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
    } as components['schemas']['ModelicaEnvelop'])
    const analysis = Analysis.from({
        parameters: [
            {
                name: 'start_time',
                value: 0,
            },
            {
                name: 'final_time',
                value: 4,
            },
        ],
        type: customFunction,
    })

    const modelExperiment = ExperimentDefinition.from({
        analysis,
        extensions,
        model,
        modifiers,
    })

    const expectedDefinition = { ...mockTestDefinition }
    expectedDefinition.base.modifiers = modifiers

    expect(modelExperiment.toModelicaExperimentDefinition()).toEqual(
        expectedDefinition
    )
})

test('From ModelicaExperimentDefinition and back should produce original ModelicaExperimentDefinition', () => {
    const modelExperiment =
        ExperimentDefinition.fromModelicaExperimentDefinition(
            mockTestDefinition
        )

    expect(modelExperiment.toModelicaExperimentDefinition()).toEqual(
        mockTestDefinition
    )
})

test('Validate that a ModelicaExperimentDefinition with explicit model options are not overwritten by customFunction options', () => {
    const customFunctionOptions = {
        compiler: {
            c_compiler: 'gcc',
            generate_html_diagnostics: false,
            include_protected_variables: false,
        },
        runtime: {},
        simulation: { ncp: 500, dynamic_diagnostics: false },
        solver: {},
    }
    const analysis = Analysis.from({
        customFunctionOptions,
        parameters: [
            {
                name: 'start_time',
                value: 0,
            },
            {
                name: 'final_time',
                value: 10,
            },
        ],
        simulationOptions: { ncp: 250 },
        type: 'dynamic',
    })
    const model = Model.from({
        className: 'PIDController',
        customFunctionOptions,
    })
    const experimentDefinition = ExperimentDefinition.from({
        analysis,
        extensions: [],
        model,
    })

    const modelicaExperimentDefinition =
        experimentDefinition.toModelicaExperimentDefinition()

    expect(
        modelicaExperimentDefinition.base.analysis.simulationOptions?.ncp
    ).toBe(250)
})

test('Validate that a ModelicaExperimentDefinition with customFunction options are not overwritten by DefaultRuntimeOptions, DefaultCompilerOptions', () => {
    const customFunctionOptions = {
        compiler: {
            c_compiler: 'gcc',
            generate_html_diagnostics: false,
            include_protected_variables: false,
        },
        runtime: {},
        simulation: { ncp: 500, dynamic_diagnostics: false },
        solver: {},
    }

    const analysis = Analysis.from({
        customFunctionOptions,
        parameters: [
            { name: 'start_time', value: 0 },
            { name: 'final_time', value: 10 },
        ],
        type: 'dynamic',
    })
    const model = Model.from({
        className: 'PIDController',
        customFunctionOptions,
    })
    const experimentDefinition = ExperimentDefinition.from({
        analysis,
        extensions: [],
        model,
    })

    expect(experimentDefinition.toModelicaExperimentDefinition()).toEqual({
        base: {
            analysis: {
                parameters: [
                    {
                        name: 'start_time',
                        value: 0,
                    },
                    {
                        name: 'final_time',
                        value: 10,
                    },
                ],
                simulationLogLevel: 'WARNING',
                simulationOptions: {
                    dynamic_diagnostics: false,
                    ncp: 500,
                },
                solverOptions: {},
                type: 'dynamic',
            },
            model: {
                modelica: {
                    className: 'PIDController',
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
            },
            modifiers: undefined,
        },
        extensions: [],
        version: 3,
    })
})
