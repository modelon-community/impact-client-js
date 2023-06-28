import { components, operations } from '../schema/impact-api'

export type Case = components['schemas']['Case']

export type CustomFunction =
    operations['getCustomFunction']['responses']['200']['content']['application/json']

export type ExecutionStatusType =
    operations['getExecutionStatus']['responses']['200']['content']['application/json']

export type ExperimentItem = components['schemas']['ExperimentItemV2']

export type ExperimentMetaData = components['schemas']['ExperimentMetaData']

export type WorkspaceProtocol = components['schemas']['Workspace']
export type WorkspaceDefinition =
    components['schemas']['WorkspaceDefinitionProtocol']

export type ModelicaExperimentDefinition =
    components['schemas']['ExperimentDefinition']

export type ModelicaExperimentExtensions = components['schemas']['Extensions']

export type ModelicaExperimentParameters =
    components['schemas']['Analysis']['parameters']

export type ModelicaExperimentModifiers = components['schemas']['Modifiers']

export type CaseTrajectories =
    operations['getTrajectories']['responses']['200']['content']['application/vnd.impact.trajectories.v2+json']['data']['items']

export type CaseRunInfo =
    operations['getAllCaseInfo']['responses']['200']['content']['application/json']['data']['items'][0]['run_info']

export type ExperimentTrajectories =
    operations['getTrajectories']['responses']['200']['content']['application/vnd.impact.trajectories.v2+json']['data']['items']

export type ExperimentVariables =
    operations['getVariables']['responses']['200']['content']['application/json']

export type LocalProjectProtocol = components['schemas']['LocalProjectProtocol']

export type CaseId = string
export type ExperimentId = string
export type ProjectId = string
export type WorkspaceId = string
