class DefaultExperiment {
    startTime
    stepSize
    stopTime
    tolerance

    constructor({
        startTime,
        stepSize,
        stopTime,
        tolerance,
    }: {
        startTime?: number
        stepSize?: number
        stopTime?: number
        tolerance?: number
    }) {
        this.startTime = startTime
        this.stepSize = stepSize
        this.stopTime = stopTime
        this.tolerance = tolerance
    }
}

export default DefaultExperiment
