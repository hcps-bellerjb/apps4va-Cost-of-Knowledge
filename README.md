# The Cost of Knowledge

A project for Apps4VA 2017

## Building

0. First, make sure you are running the latest Node.js-LTS release
1. Gulp is required to compile this project: `npm install -g gulp`
2. Install dependencies:
    * `npm install --production` for basic compilation or
    * `npm install` to run a development copy with source maps and a local server
3. Create the file `src/js/tokens.js` with only the line:
```javascript
export const mapbox = 'your mapbox api key';
```
4. Run with `npm run build` for basic compilation, or `npm run dev` for a dev build
    * Compiled files should be located in `dist/`
    * Dev should build to `dev/`
