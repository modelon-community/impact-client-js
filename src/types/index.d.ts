import { components, operations } from '../schema/impact-api'

export type CustomFunctionsResponse =
    operations['getCustomFunctions']['responses']['200']['content']['application/json']
export type ExecuteExperimentResponse =
    operations['setupExperiment']['responses']['200']['content']['application/json']
export type GetTrajectoriesResponse =
    operations['getTrajectories']['responses']['200']['content']['application/vnd.impact.trajectories.v2+json']
export type GetWorkspacesResponse =
    operations['getWorkspaces']['responses']['200']['content']['application/json']

export type ExperimentDefinition = components['schemas']['ExperimentDefinition']
