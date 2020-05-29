# Modelon Impact Client for Javascript

## Synopsis

This is a Javascript client library for interfacing with the API of Modelon Impact.

## Background

In order to create custom interfaces to workspaces in Impact, we have introduced the
concept of webapps. This presents a web-based, model-centric view of a workspace and
will allow the creation of specialized tools for non-domain specialists.

## Overview

A webapp is a static HTML/Javascript/CSS artifact that will call into the Impact API
via the client library and present a specialized view of a model contained in a
workspace.

These webapps are usually served from Impact as customizations of a workspace, but can
be deployed separately as long as it follows the Same-Origin policy. (See the Modelon
Impact Webapp Example for an example on how to develop webapps with a custom proxy.)

In order to maintain the integrity of a workspace, and to ease the cleanup of compiled
FMUs and experiment data, it is highly recommended that it is cloned before performing
any operations on it.

You as the user or developer need not worry about credentials, since the client will
automatically preform an anonymous login when there are no active session present.
The auhorization of an anonymous login is a subset of that of any other user in the
system, and will always be guaranteed to be able to call into the API.

## Installation

Via NPM:

    npm install @modelon/impact-client-js

## Reference

See `index.js`.

## Copyright and Terms

    Copyright 2020 Modelon AB

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:

     1. Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.

     2. Redistributions in binary form must reproduce the above copyright
        notice, this list of conditions and the following disclaimer in the
        documentation and/or other materials provided with the distribution.

     3. Neither the name of the copyright holder nor the names of its
        contributors may be used to endorse or promote products derived from
        this software without specific prior written permission.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
    AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
    ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
    CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
    SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
    INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
    CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
    ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
    POSSIBILITY OF SUCH DAMAGE.
