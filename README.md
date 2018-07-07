# Huds Up

A simple dashboard for life.

## Setup

### Installation

Clone this repository locally. All packages required are included in the repository.

### Environment Variables

This project uses Dotenv to provide environment variables that are required for this project to run. The _.env.example_ file contains a list of the environment variables used in this project as well as sane defaults for them (where possible).

* **BACKINTIME_DIR**: A file path to a directory where backups are stored with the [Back In Time](http://backintime.le-web.org/) software. Back In Time produces a directory per-backup performed, and the directory is named in a predictable way that indicates when the snapshot was made (YYYYMMDD-HHMMSS-SEQ where SEQ is some sort of sequence number). Omitting a value for this will remove Back In Time backup results from the results returned from `/plugins`.
* **TTC_ROUTES_STATIONS**: A comma-separated list of Toronto Transit Commission (TTC) routes or stops (including subway, streetcar and bus) that are of interest to the user (typically routes on the commute of the user).
* **DISK_FREE_MOUNTS**: A comma-separated list of mount points for disks that the user wants to monitor for getting over-full. Any mount points added to this list should match the mount points given by the `df` command.
* **WEATHER_CITY_COORDS**: The latitude and longitude of the city for which to get weather forecasts. If omitted then weather data will not be fetched.
* **DARKSKY_API_KEY**: A Dark Sky API key. You can get one [here](https://home.openweathermap.org/users/sign_up). If omitted then weather data will not be fetched.

### Running

`npm start`

## Development

### Lint

`npm run lint`

### Testing

`npm test`

### Debugging

`npm run debug`

### Make A New Plugin

`npm run new-plugin -- <plugin name>`

### Plugins

Huds-up works by collecting plugins that each provide relevant information about life: weather forecast, commute delays, system status, etc.

A Huds-up plugin is a [Hapi server](http://hapijs.com/api#server) defined by a single JavaScript file placed in the _/plugins_ folder (e.g. _/plugins/weather.js_). The contents of _/plugins_ will be read when the server starts and each file in it will be treated as a Huds-up plugin. Each plugin should have a unique URL-safe identifier which will be used for routing and the file name.

#### Plugin Routes

A plugin with identifier **"example"** (and therefore file name _/plugins/example_) is expected to define the following routes:

* **GET** _/plugins/example_: Respond with an object containing all relevant data for the plugin. The data returned should include a `priority` field with a numerical value that represents how important the data being returned is (weather data may be more important if there will be rain, or it may be important to surface the length of time that has elapsed since the last time computer data was backed up); acceptable values are between 0 and 100, inclusive. A priority value of 100 is considered highest importance; a priority value of 0 indicates that the plugin response should be ignored. Also expected to respond with a `type` field with a unique string identifying which plugin is responding.
