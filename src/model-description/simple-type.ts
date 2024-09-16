import { VariableValueType } from '../types'
import { ModelDescriptionDefs } from './model-description.types'

export class SimpleTypeParseError extends Error { }

export class SimpleType {
    private data: ModelDescriptionDefs.Raw.SimpleType

    constructor(data: ModelDescriptionDefs.Raw.SimpleType) {
        this.data = data
    }

    public getTransformed(): ModelDescriptionDefs.Transformed.Type {
        const type = this.getType(this.data)
        if (!type) {
            throw new SimpleTypeParseError(
                'Error when parsing ModelDescription > TypeDefinitions'
            )
        }
        if (VariableValueType.Enumeration in this.data) {
            return this.getTransformedEnumeration(this.data)
        }
        console.warn(
            `SimpleType: ${type} is not yet supported. Fallbacking to { name, description }`
        )
        return this.getTransformedDefault(this.data)
    }

    private getTransformedEnumeration(
        data: ModelDescriptionDefs.Raw.SimpleTypes.Enumeration
    ): ModelDescriptionDefs.Transformed.Types.Enumeration {
        const { Enumeration, ...rest } = data

        return {
            ...rest,
            type: VariableValueType.Enumeration,
            item: {
                quantity: Enumeration.quantity,
                items: Enumeration.Item,
            },
        }
    }

    private getTransformedDefault(
        data: ModelDescriptionDefs.Raw.SimpleType
    ): ModelDescriptionDefs.Transformed.Type {
        return {
            name: data.name,
            description: data.description,
        }
    }

    private getType(data: ModelDescriptionDefs.Raw.SimpleType) {
        const types = Object.keys(
            VariableValueType
        ) as (keyof typeof VariableValueType)[]
        const type = types.find((t) => t in data)
        return type || null
    }
}
