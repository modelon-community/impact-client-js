# impact-client-js

impact-client-js is a library created to simplify interaction with Modelon Impact.

## Installation

## Testing

Testing requires environment variables available to communicate with a running Modelon Impact installation. Put the following information in a `.env` file:

```
IMPACT_API_KEY=<your impact api key>
JH_TOKEN=<your JH token>
JHMI_SERVER=<jhmi server address>
```

Then execute tests with:

`npm run test`

## Schema

The API schema is based on the build output from the impact-openapi beta branch which has then been passed through openapi-typescript.
