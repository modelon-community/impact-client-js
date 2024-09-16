import { ModelicaExperimentDefinition } from '../../src/types'

export const testDefinitionMockData: ModelicaExperimentDefinition = {
    version: 3,
    base: {
        model: {
            modelica: {
                className: 'Modelica.Blocks.Examples.PID_Controller',
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
            type: 'dynamic',
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
            simulationOptions: {
                ncp: 100,
                dynamic_diagnostics: false,
            },
            solverOptions: {},
            simulationLogLevel: 'WARNING',
        },
    },
    extensions: [
        {
            modifiers: {
                variables: [
                    {
                        kind: 'value',
                        dataType: 'REAL',
                        name: 'inertia1.w',
                        value: 1,
                    },
                    {
                        kind: 'value',
                        dataType: 'REAL',
                        name: 'inertia2.w',
                        value: 2,
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
                        dataType: 'REAL',
                        name: 'inertia1.w',
                        value: 2,
                    },
                    {
                        kind: 'value',
                        dataType: 'REAL',
                        name: 'inertia2.w',
                        value: 3,
                    },
                ],
                initializeFrom: null,
                initializeFromCase: null,
                initializeFromExternalResult: null,
            },
        },
    ],
}
