import { ModelicaExperimentDefinition } from '../../src/types'

export const mockBasicExperimentDefinition: ModelicaExperimentDefinition = {
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
                compilerLogLevel: 'w',
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
                    value: 1,
                },
            ],
            simulationOptions: {
                ncp: 500,
                dynamic_diagnostics: false,
            },
            solverOptions: {
                rtol: '0.000001',
            },
            simulationLogLevel: 'WARNING',
        },
    },
    extensions: [
        {
            analysis: {
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
                simulationLogLevel: 'ERROR',
            },
            modifiers: {
                variables: [
                    {
                        name: 'inertia1.J',
                        value: 1,
                        dataType: 'REAL',
                        kind: 'value',
                    },
                    {
                        name: 'inertia2.J',
                        value: 2,
                        dataType: 'REAL',
                        kind: 'value',
                    },
                ],
                initializeFrom: null,
                initializeFromCase: null,
                initializeFromExternalResult: null,
            },
        },
        {
            analysis: {
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
                simulationLogLevel: 'ERROR',
            },
            modifiers: {
                variables: [
                    {
                        name: 'inertia1.J',
                        value: 2,
                        dataType: 'REAL',
                        kind: 'value',
                    },
                    {
                        name: 'inertia2.J',
                        value: 4,
                        dataType: 'REAL',
                        kind: 'value',
                    },
                ],
                initializeFrom: null,
                initializeFromCase: null,
                initializeFromExternalResult: null,
            },
        },
    ],
}
