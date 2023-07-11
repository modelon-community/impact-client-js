import { CustomFunctionOptions, ModelDefinition } from './types'

class Model {
    customFunctionOptions?: CustomFunctionOptions
    private model: ModelDefinition

    private static DefaultModelicaModelContent = {
        compilerLogLevel: 'warning',
        compilerOptions: {
            c_compiler: 'gcc',
        },
        fmiTarget: 'me',
        fmiVersion: '2.0',
        platform: 'auto',
        runtimeOptions: {},
    }

    private constructor({
        customFunctionOptions,
        model,
    }: {
        customFunctionOptions?: CustomFunctionOptions
        model: ModelDefinition
    }) {
        this.customFunctionOptions = customFunctionOptions
        this.model = model
    }

    static from({
        className,
        customFunctionOptions,
    }: {
        className: string
        customFunctionOptions?: CustomFunctionOptions
    }) {
        return new Model({
            customFunctionOptions,
            model: { modelica: { className } } as ModelDefinition,
        })
    }

    static fromModelDefinition(model: ModelDefinition) {
        return new Model({ model })
    }

    toModelDefinition() {
        if ('fmu' in this.model) {
            return this.model
        }
        // First populate with default settings.
        let modelDefinition = JSON.parse(
            JSON.stringify(Model.DefaultModelicaModelContent)
        )

        // Then apply custom function options if available
        if (this.customFunctionOptions?.options?.compiler) {
            modelDefinition.compilerOptions = Object.assign(
                modelDefinition.compilerOptions,
                this.customFunctionOptions.options.compiler
            )
        }
        if (this.customFunctionOptions?.options?.runtime) {
            modelDefinition.runtimeOptions = Object.assign(
                modelDefinition.runtimeOptions,
                this.customFunctionOptions.options.runtime
            )
        }

        // then apply the actual model settings
        modelDefinition = Object.assign(modelDefinition, this.model.modelica)

        if (this.model.modelica.compilerOptions) {
            modelDefinition.compilerOptions = Object.assign(
                modelDefinition.compilerOptions,
                this.model.modelica.compilerOptions
            )
        }

        if (this.model.modelica.runtimeOptions) {
            modelDefinition.runtimeOptions = Object.assign(
                modelDefinition.runtimeOptions,
                this.model.modelica.runtimeOptions
            )
        }
        return { modelica: modelDefinition }
    }
}

export default Model
