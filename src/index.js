/*
 * Modelon Impact Client for Javascript
 *
 * Copyright 2020 Modelon AB
 *
 * See LICENSE for terms
 */

const semverSatisfies = require("semver/functions/satisfies");

// Constants /////////////////////////////////////////////////////////////////
const API_VERSION = "^1.8.0 || ^2.0.0 || ^3.0.0";

// Utilities /////////////////////////////////////////////////////////////////

function _panic(msg, data) {
    const extraInfo = data ? `: ${JSON.stringify(data)}` : ''
    return new Error(`${msg}${extraInfo}`);
}

function _getCustomizedWorkspaceId(impactUrl) {
    let basePath = impactUrl ? new URL(impactUrl).pathname : '';
    let path = window.location.pathname.replace(basePath, '');
    let components = path.split('/');
    let workspaceIndex = components.indexOf('workspaces');

    if (workspaceIndex == -1) {
        return null;
    }

    return components[workspaceIndex + 2] === "customization"
        ? components[workspaceIndex + 1]
        : null;
}


function _getParams(impactUrl) {
    let params = new URLSearchParams(window.location.search);
    let workspaceId = params.get("workspace_id") || params.get("workspaceId");
    let bumpInterval = params.get("bump_interval") || params.get("bumpInterval");
    let customizedWorkspaceId = _getCustomizedWorkspaceId(impactUrl);

    return {
        workspaceId: customizedWorkspaceId || workspaceId,
        bumpInterval
    };
}

const _responses = {
    402: "No license available",
    500: "Unexpected error"
};

function _request(path, method, init) {
    return fetch(path, {
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/vnd.impact.experiment.v2+json"
        },
        credentials: "include",
        method,
        ...init
    }).then(response =>
        response.text().then(body => {
            if (!response.ok) {
                return Promise.reject({response, body})
            }

            try {
                return JSON.parse(body);
            } catch (err) {
                return body;
            }
        })
    );
}

function _downloadFile(path, filename) {
    const a = document.createElement("a");
    a.href = path;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function _addLoginAndRetryIfAuthFails(request, credentialResolver) {
    return function(...args) {
        const result = request.apply(this, args);
        return result.catch(({response, body}) => {
            if (response.status === 401) {
                return credentialResolver(() => request.apply(this, args))
            } else {
                throw _panic(_responses[response.status] || "Request failed", body);
            }
        })
    }
}

function _login(callback, impactUrl) {
    return _request(`${impactUrl}/api/login`, "POST").then(() => callback());
}

function _credentialResolver(impactUrl) {
    return (callback) => _login(callback, impactUrl)
}

function _requestWithLoginRetry(impactUrl) {
    const credentialResolver = _credentialResolver(impactUrl);
    return _addLoginAndRetryIfAuthFails(_request, credentialResolver)
}

// API wrapper class /////////////////////////////////////////////////////////

function API(workspaceId, impactUrl='') {
    let params = _getParams(impactUrl);
    this._workspaceId = workspaceId || params.workspaceId;
    this._impactUrl = impactUrl.endsWith('/') ? impactUrl.slice(0, -1) : impactUrl;
}

// Private methods ///////////////////////////////////////////////////////////
API.prototype._requestWithLoginRetry = function(path, method, init) {
    const requestWithRetry = _requestWithLoginRetry(this._impactUrl);
    return requestWithRetry(path, method, init);
};

API.prototype._addApiPrefix = function(url) {
    return `${this._impactUrl}/api/workspaces/${this._workspaceId}/${url.replace(/^\//, "")}`;
};

API.prototype._buildQueryString = function(query) {
    return Object.keys(query).length
        ? `?${Object.keys(query)
        .reduce((arr, key) => [...arr, `${key}=${query[key]}`], [])
        .join("&")}`
    : "";
};

API.prototype._doPost = function(path, body) {
    return this._requestWithLoginRetry(this._addApiPrefix(path), "POST", {
        body: JSON.stringify(body || {})
    });
};

API.prototype._doGet = function(path, query) {
    return this._requestWithLoginRetry(
        this._addApiPrefix(path) + this._buildQueryString(query || {}),
        "GET",
        {}
    );
};

API.prototype._doPut = function(path, body) {
    return this._requestWithLoginRetry(this._addApiPrefix(path), "PUT", {
        body: JSON.stringify(body || {})
    });
};

API.prototype._setTimeoutPromise = function(fn, timeout) {
    return new Promise((resolve, reject) => {
        setTimeout(
            () =>
            fn()
                .then(resolve)
                .catch(reject),
            timeout
        );
    });
};

API.prototype._waitForCompilationToFinish = function(fmu) {
    const wait = () =>
          this._doGet(`/model-executables/${fmu.id}/compilation`).then(status =>
              status.status === "cancelled" || status.status === "done"
                  ? Promise.resolve(status)
                  : this._setTimeoutPromise(wait, 500)
          );

    return wait();
};

API.prototype._waitForExperimentToFinish = function(experiment) {
    const wait = () =>
          this._doGet(
              `/experiments/${experiment.experiment_id}/execution`
          ).then(status =>
              status.status === "cancelled" || status.status === "done"
                  ? Promise.resolve(status)
                  : this._setTimeoutPromise(wait, 500)
          );

    return wait();
};

API.prototype._getCompilationInfo = function(fmu) {
    return this._doGet(`/model-executables/${fmu.id}`);
};

API.prototype._getExperimentInfo = function(experiment) {
    return this._doGet(`/experiments/${experiment.experiment_id}`);
};

API.prototype._compileAndWait = function(fmu) {
    return this._doPost(`/model-executables/${fmu.id}/compilation`)
        .then(() => this._waitForCompilationToFinish(fmu))
        .then(() => fmu);
};

API.prototype._checkCompilationResult = function(fmu) {
    return this._getCompilationInfo(fmu).then(({ run_info }) => {
        if (run_info.status === "successful") {
            return fmu;
        }
        throw _panic("Compilation failed", run_info.errors);
    });
};

API.prototype._runExperimentAndWait = function(experiment) {
    return this._doPost(`/experiments/${experiment.experiment_id}/execution`)
        .then(() => this._waitForExperimentToFinish(experiment))
        .then(() => experiment);
};

API.prototype._checkExperimentResult = function(experiment) {
    return this._getExperimentInfo(experiment).then(({ run_info }) => {
        if (run_info.failed === 0) {
            return experiment;
        }
        throw _panic("Failed to check experiment result", run_info);
    });
};

API.prototype._getTrajectories = function(experiment, variableName) {
    return this._doPost(`/experiments/${experiment.experiment_id}/trajectories`, {
        variable_names: [variableName]
    }).then(res => res[0]);
};

API.prototype._getCustomFunctionOptions = function(functionName) {
    return this._doGet(`/custom-functions/${functionName}/options`);
};

API.prototype._getCachedFMU = function(input) {
    return this._doPost(`/model-executables?getCached=true`, {input});
};

API.prototype._compileWithInput = function(input) {
    return this._doPost("/model-executables", { input })
        .then(this._compileAndWait.bind(this))
        .then(this._checkCompilationResult.bind(this));
};

API.prototype._simulateWithInput = function(input) {
    return this._doPost("/experiments", { experiment: input })
        .then(this._runExperimentAndWait.bind(this))
        .then(this._checkExperimentResult.bind(this));
};

API.prototype._compile = function(input = {}, withOptionsFrom = "dynamic", useCached = true) {
    const defaultInput = {
        compiler_log_level: "w",
        compiler_options: {
            c_compiler: "gcc"
        },
        runtime_options: {},
        fmi_target: "me",
        fmi_version: "2.0",
        platform: "auto"
    };

    let chain = Promise.resolve();

    if (withOptionsFrom) {
        chain = chain
            .then(() => this._getCustomFunctionOptions(withOptionsFrom))
            .then((options) => {
                let inputWithOptions = defaultInput;
                inputWithOptions.compiler_options = Object.assign(inputWithOptions.compiler_options, options.compiler);

                inputWithOptions.runtime_options = Object.assign(inputWithOptions.runtime_options, options.runtime);
                return inputWithOptions;
            });
    }
    else {
        chain = chain.then(() => defaultInput);
    }

    return chain.then((inputWithOptions) => {
        let mergedInput = Object.assign(inputWithOptions, input);
        if (useCached) {
            return this._getCachedFMU(mergedInput)
                .then((fmu) => (fmu.id === null) ? this._compileWithInput(mergedInput) : fmu);
        }
        else {
            return this._compileWithInput(mergedInput);
        }
    });
};

// Public methods ////////////////////////////////////////////////////////////
/**
 * [DEPRECATED] Compile a model with sensible default values
 *
 * @param {string} className - The model to compile
 * @param {string} fmiTarget - The FMI target (default: "me")
 * @returns {Promise<object>} The object representing a compiled FMU
 */
API.prototype.deprecated_compile = function(className, fmiTarget = "me") {
    return this._compileWithInput({
        class_name: className,
        compiler_log_level: "w",
        compiler_options: {
            c_compiler: "gcc"
        },
        runtime_options: {},
        fmi_target: fmiTarget,
        fmi_version: "2.0",
        platform: "auto"
    });
};

/**
 * [DEPRECATED] Compile a model with specified input
 *
 * @param {object} input - an input object with detailed options
 * @returns {Promise<object>} The object representing a compiled FMU
 */
API.prototype.deprecated_compileWithInput = function(input) {
    return this._compileWithInput(input);
};

/**
 * [DEPRECATED] Compile a model with default options from the given analysis function
 *
 * @param {string} className - The model to compile
 * @param {string} fmiTarget - The FMI target (default: "me")
 * @params {string} analysisFunction - The custom function to take compile/runtime-options from (default: "dynamic")
 * @returns {Promise<object>} The object representing a compiled FMU
 */
API.prototype.deprecated_compileWithDefaults = function(className, fmiTarget = "me", analysisFunction = "dynamic") {
    return this._getCustomFunctionOptions(analysisFunction)
        .then((options) =>
            this._compileWithInput({
                class_name: className,
                compiler_log_level: "w",
                compiler_options: options.compiler,
                runtime_options: options.runtime,
                fmi_target: fmiTarget,
                fmi_version: "2.0",
                platform: "auto"
            }));
};

/**
 * Compile a model with the given input.
 *
 * @param {object} input - The input that overrides defaults and options. (Requires attribute "class_name" to be specified.) [See more in the POST body of the compilation endpoint in the API Reference.]
 * @param {string} withOptionsFrom - Use the options taken from the specified analysis function. (Default: "dynamic")
 * @oaram {boolean} useCached - Try to find a cached FMU before attempting to compile. (Default: true)
 * @returns {Promise<object>} The object representing a compiled FMU
 */
API.prototype.compile = function(input = {}, withOptionsFrom = "dynamic", useCached = true) {
    return this._compile(input, withOptionsFrom, useCached);
};

/**
 * [DEPRECATED] Run a simulation using a given FMU
 *
 * @param {object} fmu - The object corresponding a compiled FMU
 * @param {object} parameters - A set of parameters for the analysisFunction (default: {})
 * @param {object} variables - A set of variables (default: {})
 * @param {string} analysisFunction - The analysis function to use (default: "dynamic")
 * @returns {Promise<string>} An experiment id
 */
API.prototype.deprecated_simulate = function(
    fmu,
    parameters = {},
    variables = {},
    analysisFunction = "dynamic"
) {
    return this._simulateWithInput({
        analysis: {
            analysis_function: analysisFunction,
            parameters,
        },
        fmu_id: fmu.id,
        modifiers: { variables }
    });
};

/**
 * [DEPRECATED] Run a simulation using a given FMU and use default parameters from the analysis function
 *
 * @param {object} fmu - The object corresponding a compiled FMU
 * @param {object} variables - A set of variables (default: {})
 * @param {string} analysisFunction - The analysis function to use (default: "dynamic")
 * @returns {Promise<string>} An experiment id
 */
API.prototype.deprecated_simulateWithDefaults = function(fmu, variables = {}, analysisFunction = "dynamic") {
    return this._getCustomFunctionOptions(analysisFunction)
        .then((options) =>
            this._simulateWithInput({
                analysis: {
                    analysis_function: analysisFunction,
                    parameters: options.simulation,
                },
                fmu_id: fmu.id,
                modifiers: { variables }
            }));
};

/**
 * Run a simulation on a given FMU or model.
 *
 * @param {object|string} fmuOrModel - The object corresponding a compiled FMU or the model name.
 * @param {object} variables - A set of variables (default: {})
 * @param {object} parameters - A set of parameters for the analysisFunction (default: {})
 * @param {string} analysisFunction - The analysis function to use (default: "dynamic")
 * @param {boolean} useCached - Use cached FMU if available when a model name is specified (default: true)
 * @returns {Promise<string>} An experiment id
 */
API.prototype.simulate = function(fmuOrModel, variables = {}, parameters = {}, analysisFunction = "dynamic", useCached = true) {
    let chain = Promise.resolve();

    if (typeof fmuOrModel === 'string') {
        chain = chain.then(() => this._compile({class_name: fmuOrModel}, analysisFunction, useCached));
    }
    else {
        chain = chain.then(() => fmuOrModel);
    }

    return chain.then((fmu) =>
        this._getCustomFunctionOptions(analysisFunction)
            .then((options) =>
                this._simulateWithInput({
                    analysis: {
                        analysis_function: analysisFunction,
                        parameters: Object.assign(options.simulation, parameters),
                    },
                    fmu_id: fmu.id,
                    modifiers: { variables }
                })));
};

/**
 * Get a list of all variable names in the result of an experiment
 *
 * @param {object} experiment - The object corresponding an experiment
 * @returns {Promise<string[]>} The variable names
 */
API.prototype.getVariables = function(experiment) {
    return this._doGet(
        `/experiments/${experiment.experiment_id}/variables`
    ).then(names => names.sort());
};

/**
 * Get the result values for a variable in an experiment
 *
 * @param {object} experiment - The object corresponding an experiment
 * @param {string} variableName - The name of the variable
 * @returns {Promise<number[]>} The result values
 */
API.prototype.getTrajectories = function(experiment, variableName) {
    return this._getTrajectories(experiment, variableName);
};

/**
 * Get the result values for a multiple variables
 *
 * @param {object} experiment - The object corresponding an experiment
 * @param {string[]} variableNames - A list of variable names
 * @returns {Promise<object>} An object where the keys are the variable names and the values the result values
 */
API.prototype.getVariableValues = function(experiment, variableNames) {
    return Promise.all(
        variableNames.map(v => this._getTrajectories(experiment, v))
    ).then(results =>
        variableNames.reduce((acc, name, i) => {
            acc[name] = results[i];

            return acc;
        }, {})
    );
};

/**
 * Downloads a specified FMU
 *
 * @param {object} fmu - The FMU in question
 * @returns {void}
 */
API.prototype.downloadFMU = function(fmu) {
    return _downloadFile(
        this._addApiPrefix(`/model-executables/${fmu.id}/binary`),
        `${this.workspaceId}_${fmu.id}.fmu`
    );
};

/**
 * Get the current model name
 *
 * @returns {string} The current model name
 */
API.prototype.getCurrentModel = function() {
    return new URL(window.location.href).searchParams.get("model");
};

// Exports ///////////////////////////////////////////////////////////////////

/**
 * Clones a workspace
 *
 * @param {string} workspaceId - The id of the workspace
 * @param {number} bumpInterval - Bumps the expiration of the clone with the interval given in seconds
 * @param {string} impactUrl - URL to the Impact instance to use. Required if Impact is not running at the root, i.e. if it is located on some path like http://example.com/some/path
 * @returns {Promise<object>} An object containing the workspaceId of the cloned workspace and the intervalId of the bumper
 * @throws {Error} If no workspace id is present
 * @throws {TypeError} If impactURL is not a valid URL
 */
export function cloneWorkspace(workspaceId, bumpInterval, impactUrl = "") {
  throw _panic("cloneWorkspace was removed in Modelon Impact REST API 4.0.0 and is as a consequence not supported in impact-client-js from version 2.0.0.");
}

/**
 * Creates a client object
 *
 * @param {string} workspaceId - The id of the workspace
 * @param {string} impactUrl - URL to the Impact instance to use. Required if Impact is not running at the root, i.e. if it is located on some path like http://example.com/some/path
 * @returns {Promise<API>} An API-object for the given workspace
 * @throws {Error} If no workspace id is present
 * @throws {TypeError} If impactUrl is not a valid URL
 */
export function createClient(workspaceId, impactUrl='') {
    let params = _getParams();
    workspaceId = workspaceId || params.workspaceId;
    if (!workspaceId) {
        throw _panic(
            "Need to supply workspace id in parameter or querystring, or by running the webapp as a customization."
        );
    }

    return _request(`${impactUrl}/api`, "GET").then(apiInfo => {
        if (!semverSatisfies(apiInfo.version, API_VERSION)) {
            throw _panic(
                `Incompatible API version (must satisfy ${API_VERSION}, got ${apiInfo.version})`
            );
        } else {
            return new API(workspaceId, impactUrl);
        }
    });
}
