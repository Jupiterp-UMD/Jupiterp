# Jupiterp

Jupiterp is a website built to help students at the University of Maryland plan their schedules and make informed decisions about their course and section selections. Jupiterp provides a course planner that allows students to search for courses, see sections complete with professor reviews from [PlanetTerp](https://planetterp.com), and visualize their course schedule.

This repository is for the main Jupiterp site, which is built with SvelteKit and TypeScript. In addition to this repository, other components of Jupiterp can be found in the [jupiterp-umd](https://github.com/jupiterp-umd) GitHub group, including:
- The [Jupiterp API](http://api.jupiterp.com/), an open-source API for getting course data
- The Jupiterp web-scraper, which collects course information to be used in the site
- The [@jupiterp/jupiterp](https://www.npmjs.com/package/@jupiterp/jupiterp/) npm package, which provides a TS interface wrapping the Jupiterp API

Jupiterp is not officially affiliated with the University of Maryland; it is primarily managed and maintained by @chase-fournier and the JupiTerp Maintaining Team. Contact admin@jupiterp.com for any inquiries.

For more information on Jupiterp and on contributing to this project please see `CONTRIBUTING.md`. Otherwise, see the instructions below to learn how to work on this project.

## Getting Started

### Prerequisite Installations

Before working on Jupiterp, make sure your computer has installed [Node.js](https://nodejs.org/en/download) and can use the Node Package Manager (npm). After cloning the repository, navigate to the `/site` folder and run `npm i` to install all dependencies.

#### Site

To test the site, navigate to the `site` folder. Use `npm run dev` to run the site locally, then use a browser to navigate to http://localhost:5173/. Use `npm run fix` to format the code. `npm run check` and `npm run lint` are used for catch more complex formatting errors, and discover hidden bugs.

## Contributing

See `CONTRIBUTING.md` to view instructions on the collaborative development process for Jupiterp.
