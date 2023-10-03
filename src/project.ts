import { ExperimentItem, ProjectId, WorkspaceId } from './types'
import Api from './api'
import Experiment from './experiment'
import ExperimentDefinition from './experiment-definition'

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
        const experimentItems = await this.api.getProjectExperiments({
            projectId: this.id,
            workspaceId: this.workspaceId,
        })
        if (!experimentItems) {
            // TODO: Throw error
            return []
        }

        return experimentItems.map(
            (experimentItem: ExperimentItem) =>
                new Experiment({
                    api: this.api,
                    definition: experimentItem['experiment']
                        ? ExperimentDefinition.fromModelicaExperimentDefinition(
                              experimentItem['experiment']
                          )
                        : undefined,
                    id: experimentItem.id ?? '',
                    metaData: experimentItem['meta_data'],
                    workspaceId: this.workspaceId,
                })
        )
    }
}

export default Project
