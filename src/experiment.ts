export const getExperimentDefinition = (className: string) => ({
    experiment: {
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
    },
})
