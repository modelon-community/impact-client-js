import { components, operations } from '../schema/impact-api'

export type Case = components['schemas']['Case']
export type CustomFunctionOptions =
    components['schemas']['CaseExecutionOptions']['options']

export type CustomFunction =
    operations['getCustomFunction']['responses']['200']['content']['application/json']

export type ExecutionOptions = NonNullable<
    NonNullable<
        operations['execute']['requestBody']
    >['content']['application/json']['options']
>

export type ExecutionStatusType =
    operations['getExecutionStatus']['responses']['200']['content']['application/json']

export type ExperimentItem = components['schemas']['ExperimentItemV3']

export type ExperimentMetaData = components['schemas']['ExperimentMetaData']

export type WorkspaceProtocol = components['schemas']['Workspace']
export type WorkspaceDefinition =
    components['schemas']['WorkspaceDefinitionProtocol']

export type ModelicaExperimentDefinition =
    components['schemas']['ExperimentDefinitionV3']

export type ModelDefinition =
    | components['schemas']['FmuEnvelop']
    | components['schemas']['ModelicaEnvelop']

export type ModelicaExperimentExtensions =
    components['schemas']['ExtensionV3'][]

export type ModelicaExperimentAnalysisParameters =
    components['schemas']['AnalysisV3']['parameters']
export type ModelicaExperimentSimulationOptions =
    components['schemas']['AnalysisV3']['simulationOptions']
export type ModelicaExperimentSolverOptions =
    components['schemas']['AnalysisV3']['solverOptions']
export type ModelicaExperimentSimulationLogLevel =
    components['schemas']['AnalysisV3']['simulationLogLevel']
export type ModelicaExperimentAnalysis = components['schemas']['AnalysisV3']

export type ModelicaExperimentModifiers = components['schemas']['ModifiersV3']

export type CaseInput = NonNullable<
    NonNullable<
        NonNullable<
            operations['getAllCaseInfo']['responses']['200']['content']['application/json']['data']
        >['items']
    >[0]['input']
>

export type CaseTrajectories = NonNullable<
    NonNullable<
        NonNullable<
            operations['getTrajectories']['responses']['200']['content']['application/vnd.impact.trajectories.v2+json']['data']
        >['items']
    >[0]['items']
>

export type CaseRunInfo = NonNullable<
    NonNullable<
        operations['getAllCaseInfo']['responses']['200']['content']['application/json']['data']
    >['items']
>[0]['run_info']

export type ExperimentRunInfo =
    components['schemas']['ExperimentItemV3']['run_info']

export type ExperimentTrajectories = NonNullable<
    NonNullable<
        operations['getTrajectories']['responses']['200']['content']['application/vnd.impact.trajectories.v2+json']['data']
    >['items']
>

export type ExperimentVariables =
    operations['getVariables']['responses']['200']['content']['application/json']

export type LocalProjectProtocol = components['schemas']['LocalProjectProtocol']

export type FmuModel = components['schemas']['FmuModel']
export type ModelicaModel = components['schemas']['ModelicaModel']

export type ModelExecutableInfo = components['schemas']['ModelExecutableItemV2']

const modelTypes = ['fmuModel', 'modelicaModel'] as const
export type ModelType = (typeof modelTypes)[number]

export type CaseDefinition = components['schemas']['ExtensionV3'] & {
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

export enum VariableValueType {
    Real = 'Real',
    Integer = 'Integer',
    Boolean = 'Boolean',
    String = 'String',
    Enumeration = 'Enumeration',
}

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
