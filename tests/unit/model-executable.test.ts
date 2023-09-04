import ModelExecutable from '../../src/model-executable'
import fs from 'fs'
import { expect, test, vi } from 'vitest'
import Api from '../../src/api'
import { BaseUnit } from '../../src/types'

const modelDescription = fs.readFileSync(
    './tests/unit/modelDescription.xml',
    'utf-8'
)

vi.mock('../../src/api', () => {
    const Api = vi.fn()

    Api.prototype.getModelDescription = async () => modelDescription

    return { default: Api }
})

test('Create and examine a ModelExecutable instance', async () => {
    // @ts-ignore
    const api = new Api({
        impactApiKey: 'mock-api-key',
        jupyterHubToken: 'mock-jh-token',
    })

    const modelExecutable = await ModelExecutable.from({
        api,
        fmuId: 'some-fmu-id',
        workspaceId: 'some-ws-id',
    })

    const md = await modelExecutable.getModelDescription()

    const defaultExperiment = await md.getDefaultExperiment()

    expect(defaultExperiment?.startTime).toBe(undefined)
    expect(defaultExperiment?.stepSize).toBe(undefined)
    expect(defaultExperiment?.stopTime).toBe(4.0)
    expect(defaultExperiment?.tolerance).toBe(undefined)

    const variables = md.getVariables()

    expect(variables.length).toBe(182)

    expect(variables[0].Real.relativeQuantity).toEqual('false')
    expect(variables[0].name).toEqual('PI.Dzero.k')

    const units = md.getUnits()
    expect(units.length).toBe(10)

    expect(units[0].name).toEqual('rad')
    expect(units[0].DisplayUnit.length).toEqual(2)

    expect((units[2].BaseUnit as BaseUnit).s).toEqual('1')
})
