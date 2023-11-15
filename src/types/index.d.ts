import { components, operations } from '../schema/impact-api'

export type Case = components['schemas']['Case']
export type CustomFunctionOptions =
    components['schemas']['CaseExecutionOptions']['options']

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
export type ModelDefinition = components['schemas']['Model']

export type ModelicaExperimentExtensions = components['schemas']['Extensions']

export type ModelicaExperimentAnalysisParameters =
    components['schemas']['Analysis']['parameters']
export type ModelicaExperimentSimulationOptions =
    components['schemas']['Analysis']['simulationOptions']
export type ModelicaExperimentSolverOptions =
    components['schemas']['Analysis']['solverOptions']
export type ModelicaExperimentSimulationLogLevel =
    components['schemas']['Analysis']['simulationLogLevel']
export type ModelicaExperimentAnalysis = components['schemas']['Analysis']

export type ModelicaExperimentModifiers = components['schemas']['Modifiers']

export type CaseInput =
    operations['getAllCaseInfo']['responses']['200']['content']['application/json']['data']['items'][0]['input']

export type CaseTrajectories =
    operations['getTrajectories']['responses']['200']['content']['application/vnd.impact.trajectories.v2+json']['data']['items'][0]['items']

export type CaseRunInfo =
    operations['getAllCaseInfo']['responses']['200']['content']['application/json']['data']['items'][0]['run_info']

export type ExperimentRunInfo =
    components['schemas']['ExperimentItemV2']['run_info']

export type ExperimentTrajectories =
    operations['getTrajectories']['responses']['200']['content']['application/vnd.impact.trajectories.v2+json']['data']['items']

export type ExperimentVariables =
    operations['getVariables']['responses']['200']['content']['application/json']

export type LocalProjectProtocol = components['schemas']['LocalProjectProtocol']

export type FmuModel = components['schemas']['FmuModel']
export type ModelicaModel = components['schemas']['ModelicaModel']

export type ModelExecutableInfo =
    components['schemas']['ModelExecutableListV2'][0]

const modelTypes = ['fmuModel', 'modelicaModel'] as const
export type ModelType = typeof modelTypes[number]

export type CaseDefinition = components['schemas']['Extensions'][0] & {
    caseId: string
}

export type CaseId = string
export type ExperimentId = string
export type FmuId = string
export type ProjectId = string
export type WorkspaceId = string

export type BaseUnitAttribute =
    | 'kg'
    | 'm'
    | 's'
    | 'A'
    | 'K'
    | 'mol'
    | 'cd'
    | 'rad'
    | 'factor'
    | 'offset'

export type BaseUnit = { [key in BaseUnitAttribute]: string }
export type UnitDefinition = { name: string; factor?: string; offset?: string }
export type Unit = {
    BaseUnit: string | BaseUnit
    DisplayUnit: UnitDefinition[]
    name: string
}

export type VariableValueType =
    | 'Real'
    | 'Integer'
    | 'Boolean'
    | 'String'
    | 'Enumeration'

export type Variable = {
    [key in VariableValueType]: Record<string, string>
} & {
    name: string
    valueReference: string
    description: string
    causality: string
    variability: string
    initial?: string
    canHandleMultipleSetPerTimeInstant?: string
}
