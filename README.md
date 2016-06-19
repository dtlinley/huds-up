# Huds Up

A simple dashboard for life.

## Setup

### Installation

Clone this repository locally. All packages required are included in the repository.

### Running

`npm start`

## Development

### Lint

`npm run -s lint`

### Testing

`npm test`

### Plugins

Huds-up works by collecting plugins that each provide relevant information about life: weather forecast, commute delays, system status, etc.

A Huds-up plugin is a [Hapi server](http://hapijs.com/api#server) defined by a single JavaScript file placed in the _/plugins_ folder (e.g. _/plugins/weather.js_). The contents of _/plugins_ will be read when the server starts and each file in it will be treated as a Huds-up plugin. Each plugin should have a unique URL-safe identifier which will be used for routing and the file name.

#### Plugin Routes

A plugin with identifier **"example"** (and therefore file name _/plugins/example_) is expected to define the following routes:

* **GET** _/plugins/example_: Respond with an object containing all relevant data for the plugin. The data does not need to conform to any particular schema.
