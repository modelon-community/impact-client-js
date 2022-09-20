import { ModelicaExperiment } from '../src/ModelicaExperiment'

test('Create experiment without modifiers and parameters', () => {
    const customFunction = 'dynamic'
    const modelName = 'Modelica.Blocks.Examples.PID_Controller'
    const modelExperiment = ModelicaExperiment.from({
        customFunction,
        modelName,
    })

    expect(modelExperiment.toDefinition()).toEqual({
        version: 2,
        base: {
            model: {
                modelica: {
                    className: modelName,
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
                type: customFunction,
                parameters: {
                    start_time: 0,
                    final_time: 1,
                },
                simulationOptions: {
                    ncp: 500,
                    dynamic_diagnostics: false,
                },
                solverOptions: { rtol: '1e-6' },
                simulationLogLevel: 'WARNING',
            },
            modifiers: {},
        },
    })
})

test('Create experiment with modifiers and parameters', () => {
    const customFunction = 'dynamic'
    const modelName = 'Modelica.Blocks.Examples.PID_Controller'
    const modifiers = { variables: { 'inertia1.J': 2, 'PI.k': 40 } }

    const modelExperiment = ModelicaExperiment.from({
        customFunction,
        modelName,
        modifiers,
        parameters: {
            start_time: 0,
            final_time: 4,
        },
    })

    expect(modelExperiment.toDefinition()).toEqual({
        version: 2,
        base: {
            model: {
                modelica: {
                    className: modelName,
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
                type: customFunction,
                parameters: { start_time: 0, final_time: 4 },
                simulationOptions: {
                    ncp: 500,
                    dynamic_diagnostics: false,
                },
                solverOptions: { rtol: '1e-6' },
                simulationLogLevel: 'WARNING',
            },
            modifiers,
        },
    })
})