import { components, operations } from '../schema/impact-api'

export type Case = components['schemas']['Case']

export type CustomFunction =
    operations['getCustomFunction']['responses']['200']['content']['application/json']

export type ExecutionStatus =
    operations['getExecutionStatus']['responses']['200']['content']['application/json']

export type Workspace = components['schemas']['Workspace']

export type ModelicaExperimentDefinition =
    components['schemas']['ExperimentDefinition']

export type ModelicaExperimentExtensions = components['schemas']['Extensions']

export type ModelicaExperimentParameters =
    components['schemas']['Analysis']['parameters']

export type ModelicaExperimentModifiers = components['schemas']['Modifiers']

export type CaseTrajectories =
    operations['getTrajectories']['responses']['200']['content']['application/vnd.impact.trajectories.v2+json']['data']['items']

export type ExperimentTrajectories =
    operations['getTrajectories']['responses']['200']['content']['application/vnd.impact.trajectories.v2+json']['data']['items']

export type ExperimentId = string
