import DefaultExperiment from '../../src/default-experiment'
import { expect, test } from 'vitest'

test('Get parameters from default experiment', () => {
    const defaultExperiment = new DefaultExperiment({
        startTime: 10,
        stepSize: 11.1,
        stopTime: 12.2,
        tolerance: 500,
    })

    expect(defaultExperiment.startTime).toBe(10)

    expect(defaultExperiment.stepSize).toBe(11.1)

    expect(defaultExperiment.stopTime).toBe(12.2)
    expect(defaultExperiment.tolerance).toBe(500)
})
