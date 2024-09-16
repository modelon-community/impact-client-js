import { Unit, Variable, VariableValueType } from '../types'

export namespace ModelDescriptionDefs {
    export namespace Raw {
        export namespace SimpleTypes {
            export type Enumeration = {
                name: string
                description: string
                Enumeration: {
                    quantity: string
                    Item: { name: string; description: string; value: string }[]
                }
            }
        }

        export type SimpleType = SimpleTypes.Enumeration

        export type ModelDescription = {
            DefaultExperiment: Record<string, string>
            ModelVariables: {
                ScalarVariable: Variable[]
            }
            UnitDefinitions: { Unit: Unit[] }
            modelName: string
            TypeDefinitions?: {
                SimpleType?: SimpleType[]
            }
        }
    }

    export namespace Transformed {
        export namespace Types {
            export type Base = {
                name: string
                description: string
            }

            export type Enumeration = Base & {
                type: VariableValueType.Enumeration
                item: {
                    quantity: ModelDescriptionDefs.Raw.SimpleTypes.Enumeration['Enumeration']['quantity']
                    items: ModelDescriptionDefs.Raw.SimpleTypes.Enumeration['Enumeration']['Item']
                }
            }
        }

        export type Type = Types.Base | Types.Enumeration
    }
}
