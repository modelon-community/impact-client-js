import { CustomFunctionOptions, ModelDefinition } from './types'

class Model {
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

    private constructor(
        private model: ModelDefinition,
        public customFunctionOptions?: CustomFunctionOptions
    ) {}

    static from({
        className,
        customFunctionOptions,
    }: {
        className: string
        customFunctionOptions?: CustomFunctionOptions
    }) {
        return new Model(
            { modelica: { className } } as ModelDefinition,
            customFunctionOptions
        )
    }

    static fromModelDefinition(model: ModelDefinition) {
        return new Model(model)
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
        if (this.customFunctionOptions?.compiler) {
            modelDefinition.compilerOptions = Object.assign(
                modelDefinition.compilerOptions,
                this.customFunctionOptions.compiler
            )
        }
        if (this.customFunctionOptions?.runtime) {
            modelDefinition.runtimeOptions = Object.assign(
                modelDefinition.runtimeOptions,
                this.customFunctionOptions.runtime
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
