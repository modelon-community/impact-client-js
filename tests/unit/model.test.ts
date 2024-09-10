import Model from '../../src/model'
import { expect, test } from 'vitest'
import { mockTestDefinition } from './mockTestDefinition'

test('From Model and back should produce original Model', () => {
    const model = Model.fromModelDefinition(mockTestDefinition.base.model)

    expect(model.toModelDefinition()).toEqual(mockTestDefinition.base.model)
})

test('Model with only custom function name should get default options', () => {
    const model = Model.from({ className: 'PIDController' })

    expect(model.toModelDefinition()).toEqual({
        modelica: {
            className: 'PIDController',
            compilerLogLevel: 'warning',
            compilerOptions: {
                c_compiler: 'gcc',
            },
            fmiTarget: 'me',
            fmiVersion: '2.0',
            platform: 'auto',
            runtimeOptions: {},
        },
    })
})

test('Model with custom function options should override default values', () => {
    const model = Model.from({
        className: 'PIDController',
        customFunctionOptions: {
            compiler: { c_compiler: 'clang' },
            runtime: { key: 'customValue' },
        },
    })

    expect(model.toModelDefinition()).toEqual({
        modelica: {
            className: 'PIDController',
            compilerLogLevel: 'warning',
            compilerOptions: {
                c_compiler: 'clang',
            },
            fmiTarget: 'me',
            fmiVersion: '2.0',
            platform: 'auto',
            runtimeOptions: {
                key: 'customValue',
            },
        },
    })
})
