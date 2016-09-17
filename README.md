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

* **GET** _/plugins/example_: Respond with an object containing all relevant data for the plugin. The data returned should include a `priority` field with a numerical value that represents how important the data being returned is (weather data may be more important if there will be rain, or it may be important to surface the length of time that has elapsed since the last time computer data was backed up); acceptable values are between 1 and 100, inclusive. A priority value of 100 is considered highest importance. Also expected to respond with a `type` field with a unique string identifying which plugin is responding.
