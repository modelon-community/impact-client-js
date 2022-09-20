import { components, operations } from '../schema/impact-api'

export type Cases =
    operations['getAllCaseInfo']['responses']['200']['content']['application/json']['data']['items']

export type CustomFunctionsResponse =
    operations['getCustomFunctions']['responses']['200']['content']['application/json']
export type ExecuteExperimentResponse =
    operations['setupExperiment']['responses']['200']['content']['application/json']
export type GetTrajectoriesResponse =
    operations['getTrajectories']['responses']['200']['content']['application/vnd.impact.trajectories.v2+json']

export type GetWorkspacesResponse =
    operations['getWorkspaces']['responses']['200']['content']['application/json']

export type ModelicaExperimentDefinition =
    components['schemas']['ExperimentDefinition']

export type ModelicaExperimentParameters =
    components['schemas']['Analysis']['parameters']

export type ModelicaExperimentModifiers = components['schemas']['Modifiers']

export type Trajectories =
    operations['getTrajectories']['responses']['200']['content']['application/vnd.impact.trajectories.v2+json']['data']['items']

export type ExperimentId = string
