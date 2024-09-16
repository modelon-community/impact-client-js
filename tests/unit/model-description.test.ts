import { it, expect, describe } from 'vitest'
import { ModelDescription } from '../../src'
import fs from 'node:fs'
import { SimpleTypeParseError } from '../../src/model-description/simple-type'

const mockData = {
    enumerations: fs.readFileSync(
        './tests/mock-data/model-description.mock-data.xml',
        'utf-8'
    ),
    real: fs.readFileSync(
        './tests/mock-data/model-description.real.mock-data.xml',
        'utf-8'
    ),
    invalid: fs.readFileSync(
        './tests/mock-data/model-description.invalid.mock-data.xml',
        'utf-8'
    ),
    noTypeDefs: fs.readFileSync(
        './tests/mock-data/model-description.no-typedefs.mock-data.xml',
        'utf-8'
    ),
}

describe('TypeDefinitions', () => {
    it('should parse enumerations from XML', () => {
        const modelDescription = ModelDescription.fromXML(mockData.enumerations)
        const typeDefs = modelDescription.getTypeDefinitions()

        const expectedStructure = expect.objectContaining({
            name: expect.any(String),
            description: expect.any(String),
            item: expect.objectContaining({
                items: expect.arrayContaining([
                    expect.objectContaining({
                        name: expect.any(String),
                        value: expect.any(String),
                        description: expect.any(String),
                    }),
                ]),
            }),
        })

        expect(typeDefs).toBeInstanceOf(Array)
        expect(typeDefs).toHaveLength(4)
        expect(typeDefs[0]).toEqual(expectedStructure)
    })

    it('should fallback to { name, description } on valid SimpleType but not yet supported', () => {
        const modelDescription = ModelDescription.fromXML(mockData.real)
        const typeDefs = modelDescription.getTypeDefinitions()

        const expectedStructure = expect.objectContaining({
            name: expect.any(String),
            description: expect.any(String),
        })

        expect(typeDefs).toBeInstanceOf(Array)
        expect(typeDefs).toHaveLength(1)
        expect(typeDefs[0]).toEqual(expectedStructure)
    })

    it('should throw error for invalid type definition', () => {
        const modelDescription = ModelDescription.fromXML(mockData.invalid)
        expect(() => modelDescription.getTypeDefinitions()).toThrowError(
            SimpleTypeParseError
        )
    })

    it("should return an empty array if TypeDefinitions.SimpleType doesn't exist", () => {
        const modelDescription = ModelDescription.fromXML(mockData.noTypeDefs)

        const typeDefs = modelDescription.getTypeDefinitions()

        expect(typeDefs).toBeInstanceOf(Array)
        expect(typeDefs).toHaveLength(0)
    })
})
