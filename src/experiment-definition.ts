import {
    CaseDefinition,
    ModelicaExperimentDefinition,
    ModelicaExperimentExtensions,
    ModelicaExperimentModifiers,
} from './types'
import Analysis from './analysis'
import Model from './model'

class ExperimentDefinition {
    analysis?: Analysis
    extensions?: ModelicaExperimentExtensions
    model: Model
    modifiers?: ModelicaExperimentModifiers

    private constructor({
        analysis,
        extensions,
        model,
        modifiers,
    }: {
        analysis: Analysis
        extensions?: ModelicaExperimentExtensions
        model: Model
        modifiers?: ModelicaExperimentModifiers
    }) {
        this.analysis = analysis
        this.extensions = extensions
        this.model = model
        this.modifiers = modifiers
    }

    static from({
        analysis,
        extensions,
        model,
        modifiers,
    }: {
        analysis: Analysis
        extensions?: ModelicaExperimentExtensions
        model: Model
        modifiers?: ModelicaExperimentModifiers
    }): ExperimentDefinition {
        return new ExperimentDefinition({
            analysis,
            extensions,
            model,
            modifiers,
        })
    }

    static fromModelicaExperimentDefinition(
        modelicaDefinition: ModelicaExperimentDefinition
    ): ExperimentDefinition {
        return new ExperimentDefinition({
            analysis: Analysis.from(modelicaDefinition.base.analysis),
            extensions: modelicaDefinition.extensions,
            model: Model.fromModelDefinition(modelicaDefinition.base.model),
            modifiers: modelicaDefinition.base.modifiers,
        })
    }

    getCaseDefinitions = (): CaseDefinition[] =>
        (this.extensions ?? []).map((ext, index) => ({
            analysis: ext.analysis,
            caseId: `case_${index + 1}`,
            modifiers: ext.modifiers,
        }))

    toModelicaExperimentDefinition = (): ModelicaExperimentDefinition => ({
        version: 2,
        base: {
            model: this.model.toModelDefinition(),
            analysis:
                this.analysis?.toModelicaExperimentAnalysis() ??
                Analysis.DefaultAnalysis,
            modifiers: this.modifiers || {},
        },
        extensions: this.extensions || [],
    })
}

export default ExperimentDefinition
