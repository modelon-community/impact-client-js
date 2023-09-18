import { ExperimentItem, ProjectId, WorkspaceId } from './types'
import Api from './api'
import Experiment from './experiment'
import ExperimentDefinition from './experiment-definition'

class Project {
    constructor(
        private api: Api,
        public id: ProjectId,
        private workspaceId: WorkspaceId
    ) {}

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
