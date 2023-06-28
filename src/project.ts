import { ProjectId, WorkspaceId } from './types'
import Api from './api'
import Experiment from './experiment'

class Project {
    private api: Api
    id: ProjectId
    private workspaceId: WorkspaceId

    constructor({
        api,
        id,
        workspaceId,
    }: {
        api: Api
        id: ProjectId
        workspaceId: WorkspaceId
    }) {
        this.api = api
        this.id = id
        this.workspaceId = workspaceId
    }

    getExperiments = async () => {
        const experimentsResponse = await this.api.getProjectExperiments({
            projectId: this.id,
            workspaceId: this.workspaceId,
        })
        if (!experimentsResponse) {
            // TODO: Throw error
            return []
        }

        return experimentsResponse.map(
            (experiment: Experiment) =>
                new Experiment({
                    api: this.api,
                    id: experiment.id,
                    workspaceId: this.workspaceId,
                })
        )
    }
}

export default Project
