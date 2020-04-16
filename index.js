/*
 * Modelon Impact SDK for Javascript
 *
 * Copyright 2020 Modelon AB
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

// Utilities /////////////////////////////////////////////////////////////////

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
        throw new Error(body);
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
    .some(item =>
      item
        .trim()
        .startsWith(`${window.WAMS_AUTH_JWT_COOKIE_NAME || "jwt_cookie"}=`)
    );
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
  this._workspaceId = workspaceId;
}

// Private methods ///////////////////////////////////////////////////////////

API.prototype._addApiPrefix = function(url) {
  return `/api/workspace/${this._workspaceId}/${url.replace(/^\//, "")}`;
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

API.prototype._waitForCompilationToFinish = function(fmuId) {
  const wait = () =>
    this._doGet(`/model_executables/${fmuId}/compile`).then(status =>
      status.status === "running"
        ? this._setTimeoutPromise(wait, 500)
        : Promise.resolve(status)
    );

  return wait();
};

API.prototype._waitForExperimentToFinish = function(experimentId) {
  const wait = () =>
    this._doGet(`/experiments/${experimentId}/execute`).then(status =>
      status.status === "running"
        ? this._setTimeoutPromise(wait, 500)
        : Promise.resolve(status)
    );

  return wait();
};

API.prototype._getCompilationInfo = function(fmuId) {
  return this._doGet(`/model_executables/${fmuId}`);
};

API.prototype._getExperimentInfo = function(experimentId) {
  return this._doGet(`/experiments/${experimentId}`);
};

API.prototype._compileAndWait = function(fmuId) {
  return this._doPost(`/model_executables/${fmuId}/compile`)
    .then(() => this._waitForCompilationToFinish(fmuId))
    .then(() => fmuId);
};

API.prototype._checkCompilationResult = function(fmuId) {
  return this._getCompilationInfo(fmuId).then(({ run_info }) => {
    if (run_info.status === "successful") {
      return fmuId;
    }
    throw new Error(run_info.errors);
  });
};

API.prototype._runExperimentAndWait = function(experimentId) {
  return this._doPost(`/experiments/${experimentId}/execute`)
    .then(() => this._waitForExperimentToFinish(experimentId))
    .then(() => experimentId);
};

API.prototype._checkExperimentResult = function(experimentId) {
  return this._getExperimentInfo(experimentId).then(({ run_info }) => {
    if (run_info.failed === 0) {
      return experimentId;
    }
    throw new Error();
  });
};

// Public methods ////////////////////////////////////////////////////////////
/**
 * Compile a model
 *
 * @param {string} className - The model to compile
 * @returns {Promise<string>} The id of the compiled FMU
 */
API.prototype.compile = function(className) {
  return _ensureLoggedIn(() => {
    return this._doPost("/model_executables", {
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
 * @param fmuId {string} - The id of the FMU
 * @param startTime {number} - The start time
 * @param endTime {number} - The end time
 * @param variables {Object} - A set of variables
 * @param analysisFunction {string} - The analysis function to use (default: "dynamic")
 * @returns {Promise<string>} An experiment id
 */
API.prototype.simulate = function(
  fmuId,
  startTime,
  endTime,
  variables,
  analysisFunction
) {
  return _ensureLoggedIn(() => {
    return this._doPost("/experiments", {
      experiment: {
        analysis: {
          analysis_function: analysisFunction || "dynamic",
          parameters: {
            start_time: startTime,
            final_time: endTime
          }
        },
        fmu_id: fmuId,
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
 * @param {string} experimentId - The id of the experiment
 * @returns {Promise<string[]>} The variable names
 */
API.prototype.getVariableNames = function(experimentId) {
  return _ensureLoggedIn(() => {
    return this._doGet(`/experiments/${experimentId}/result/info`).then(names =>
      names.sort()
    );
  });
};

/**
 * Get the result values for a variable in an experiment
 *
 * @param {string} experimentId - The id of the experiment
 * @param {string} variableName - The name of the variable
 * @returns {Promise<number[]>} The result values
 */
API.prototype._getVariable = function(experimentId, variableName) {
  return this._doPost(`/experiments/${experimentId}/result/getVariables`, {
    variable_names: [variableName]
  }).then(res => res[0]);
};

API.prototype.getVariable = function(experimentId, variableName) {
  return _ensureLoggedIn(() => {
    return this._getVariable(experimentId, variableName);
  });
};

/**
 * Get the result values for a multiple variables
 *
 * @param {string} experimentId - The id of the experiment
 * @param {string[]} variableNames - A list of variable names
 * @returns {Promise<object>} An object where the keys are the variable names and the values the result values
 */
API.prototype.getVariables = function(experimentId, variableNames) {
  return _ensureLoggedIn(() => {
    return Promise.all(
      variableNames.map(v => this._getVariable(experimentId, v))
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
 */
function cloneWorkspace(workspaceId, bumpInterval) {
  return _ensureLoggedIn(() => {
    return _request(`/api/workspace/${workspaceId}/clone`, "POST").then(
      data => {
        let intervalId = setInterval(() => {
          _request(`/api/workspace/${data.workspace_id}/clone/bump`, "POST");
        }, (bumpInterval || 10) * 1000);
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
 * @returns {API} An API-object for the given workspace
 */
function createClient(workspaceId) {
  return new API(workspaceId);
}

module.exports = {
  createClient,
  cloneWorkspace
};
