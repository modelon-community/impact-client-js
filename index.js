/*
 * Modelon Impact Client for Javascript
 *
 * Copyright 2020 Modelon AB
 *
 * See LICENSE for terms
 */

// Constants /////////////////////////////////////////////////////////////////
const API_VERSION = "1.0.0";

// Utilities /////////////////////////////////////////////////////////////////

function _panic(msg, data) {
  alert(msg);
  return new Error(data || msg);
}

function _isRunAsCustomization(components) {
  return components[1] === "workspaces" && components[3] === "customization";
}

function _getParams() {
  let params = new URLSearchParams(window.location.search);
  let workspaceId = params.get("workspace_id") || params.get("workspaceId");
  let bumpInterval = params.get("bump_interval") || params.get("bumpInterval");

  let components = window.location.pathname.split("/");
  let customizedWorkspaceId = _isRunAsCustomization(components)
    ? components[2]
    : null;

  return {
    workspaceId: customizedWorkspaceId || workspaceId,
    bumpInterval
  };
}

function _request(path, method, init) {
  return fetch(path, {
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    method,
    ...init
  }).then(response =>
    response.text().then(body => {
      if (!response.ok) {
        throw _panic("Request failed", body);
      }
      try {
        return JSON.parse(body);
      } catch (err) {
        return body;
      }
    })
  );
}

function _isLoggedIn() {
  return document.cookie
    .split(";")
    .some(item => item.trim().startsWith(`access_token=`));
}

function _ensureLoggedIn(callback) {
  if (_isLoggedIn()) {
    return callback();
  } else {
    return _request("/api/login", "POST").then(() => callback());
  }
}

// API wrapper class /////////////////////////////////////////////////////////

function API(workspaceId) {
  let params = _getParams();
  this._workspaceId = workspaceId || params.workspaceId;
}

// Private methods ///////////////////////////////////////////////////////////

API.prototype._addApiPrefix = function(url) {
  return `/api/workspaces/${this._workspaceId}/${url.replace(/^\//, "")}`;
};

API.prototype._buildQueryString = function(query) {
  return Object.keys(query).length
    ? `?${Object.keys(query)
        .reduce((arr, key) => [...arr, `${key}=${query[key]}`], [])
        .join("&")}`
    : "";
};

API.prototype._doPost = function(path, body) {
  return _request(this._addApiPrefix(path), "POST", {
    body: JSON.stringify(body || {})
  });
};

API.prototype._doGet = function(path, query) {
  return _request(
    this._addApiPrefix(path) + this._buildQueryString(query || {}),
    "GET",
    {}
  );
};

API.prototype._doPut = function(path, body) {
  return _request(this._addApiPrefix(path), "PUT", {
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
      status.status === "running"
        ? this._setTimeoutPromise(wait, 500)
        : Promise.resolve(status)
    );

  return wait();
};

API.prototype._waitForExperimentToFinish = function(experiment) {
  const wait = () =>
    this._doGet(
      `/experiments/${experiment.experiment_id}/execution`
    ).then(status =>
      status.status === "running"
        ? this._setTimeoutPromise(wait, 500)
        : Promise.resolve(status)
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

// Public methods ////////////////////////////////////////////////////////////
/**
 * Compile a model
 *
 * @param {string} className - The model to compile
 * @returns {Promise<string>} The object representing a compiled FMU
 */
API.prototype.compile = function(className) {
  return _ensureLoggedIn(() => {
    return this._doPost("/model-executables", {
      input: {
        class_name: className,
        compiler_log_level: "warning",
        compiler_options: {
          c_compiler: "gcc"
        },
        runtime_options: {},
        fmi_target: "me",
        fmi_version: "2.0",
        platform: "auto"
      }
    })
      .then(this._compileAndWait.bind(this))
      .then(this._checkCompilationResult.bind(this));
  });
};

/**
 * Run a simulation using a given FMU
 *
 * @param fmu {object} - The object corresponding a compiled FMU
 * @param startTime {number} - The start time
 * @param endTime {number} - The end time
 * @param variables {Object} - A set of variables
 * @param analysisFunction {string} - The analysis function to use (default: "dynamic")
 * @returns {Promise<string>} An experiment id
 */
API.prototype.simulate = function(
  fmu,
  parameters,
  variables,
  analysisFunction
) {
  return _ensureLoggedIn(() => {
    return this._doPost("/experiments", {
      experiment: {
        analysis: {
          analysis_function: analysisFunction || "dynamic",
          parameters: parameters || {}
        },
        fmu_id: fmu.id,
        modifiers: { variables: variables || {} }
      }
    })
      .then(this._runExperimentAndWait.bind(this))
      .then(this._checkExperimentResult.bind(this));
  });
};

/**
 * Get a list of all variable names in the result of an experiment
 *
 * @param {object} experiment - The object corresponding an experiment
 * @returns {Promise<string[]>} The variable names
 */
API.prototype.getVariables = function(experiment) {
  return _ensureLoggedIn(() => {
    return this._doGet(
      `/experiments/${experiment.experiment_id}/variables`
    ).then(names => names.sort());
  });
};

/**
 * Get the result values for a variable in an experiment
 *
 * @param {object} experiment - The object corresponding an experiment
 * @param {string} variableName - The name of the variable
 * @returns {Promise<number[]>} The result values
 */
API.prototype.getTrajectories = function(experiment, variableName) {
  return _ensureLoggedIn(() => {
    return this._getTrajectories(experiment, variableName);
  });
};

/**
 * Get the result values for a multiple variables
 *
 * @param {object} experiment - The object corresponding an experiment
 * @param {string[]} variableNames - A list of variable names
 * @returns {Promise<object>} An object where the keys are the variable names and the values the result values
 */
API.prototype.getVariableValues = function(experiment, variableNames) {
  return _ensureLoggedIn(() => {
    return Promise.all(
      variableNames.map(v => this._getTrajectories(experiment, v))
    ).then(results =>
      variableNames.reduce((acc, name, i) => {
        acc[name] = results[i];

        return acc;
      }, {})
    );
  });
};

// Exports ///////////////////////////////////////////////////////////////////

/**
 * Clones a workspace
 *
 * @param {string} workspaceId - The id of the workspace
 * @param {number} bumpInterval - Bumps the expiration of the clone with the interval given in seconds
 * @returns {Promise<object>} An object containing the workspaceId of the cloned workspace and the intervalId of the bumper
 * @throws {Error} If no workspace id is present
 */
function cloneWorkspace(workspaceId, bumpInterval) {
  let params = _getParams();

  workspaceId = workspaceId || params.workspaceId;
  bumpInterval = bumpInterval || params.bumpInterval || 10;

  if (!workspaceId) {
    throw _panic("Need to supply workspace id in parameter or querystring");
  }

  return _ensureLoggedIn(() => {
    return _request(`/api/workspaces/${workspaceId}/clone`, "POST").then(
      data => {
        let intervalId = setInterval(() => {
          _request(`/api/workspaces/${data.workspace_id}`, "PUT");
        }, bumpInterval * 1000);
        return {
          workspaceId: data.workspace_id,
          intervalId
        };
      }
    );
  });
}

/**
 * Creates a client object
 *
 * @param {string} workspaceId - The id of the workspace
 * @returns {Promise<API>} An API-object for the given workspace
 * @throws {Error} If no workspace id is present
 */
function createClient(workspaceId) {
  let params = _getParams();
  workspaceId = workspaceId || params.workspaceId;
  if (!workspaceId) {
    throw _panic(
      "Need to supply workspace id in parameter or querystring, or by running the webapp as a customization."
    );
  }

  return _request(`/api`, "GET").then(apiInfo => {
    if (apiInfo.version !== API_VERSION) {
      throw _panic(
        `Incompatible API version (expected ${API_VERSION}, got ${apiInfo.version})`
      );
    } else {
      return new API(workspaceId);
    }
  });
}

module.exports = {
  createClient,
  cloneWorkspace
};
