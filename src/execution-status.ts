import { ExecutionStatusType } from './types'

class ExecutionStatus {
    status: ExecutionStatusType

    constructor(status: ExecutionStatusType) {
        this.status = status
    }

    getNbrCompilationDone = () =>
        this.status?.progresses?.filter(
            (p) =>
                (p.stage === 'compilation' && p.done) ||
                p.stage === 'simulation'
        ).length || 0

    getNbrSimulations = () =>
        this.status?.progresses?.filter((p) => p.stage === 'simulation')
            .length || 0

    getNbrSimulationDone = () =>
        this.status?.progresses?.filter(
            (p) => p.stage === 'simulation' && p.done
        ).length || 0

    getCompilationProgress = () =>
        this.status?.progresses
            ? this.getNbrCompilationDone() / this.status.progresses.length
            : 0

    getSimulationProgress = () => {
        if (this.getNbrSimulations() === 0) {
            return 0
        }
        return this.status?.progresses
            ? this.getNbrSimulationDone() / this.getNbrSimulations()
            : 0
    }
}
export default ExecutionStatus
