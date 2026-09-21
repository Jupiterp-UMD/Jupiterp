# Contributing to Jupiterp

## Introduction

Jupiterp is an open-source schedule-planning tool for students at the University of Maryland. Jupiterp expands on the capabilities of existing tools like Venus and the Testudo schedule visualizer by integrating reviews and a more intuitive interface to provide a user experience aimed at improving students' workflow and their course selection process.

## Code of Conduct

Any contributor to Jupiterp must abide by our code of conduct. To foster an inclusive and productive environment, all contributors must maintain respect toward others' age, ethnicity, race, gender identity and expression, sexual identity and expression, level of experience or skill, religion, or any other aspect of identity or belief. Jupiterp should be a friendly, collaborative community focused on improving the experience of UMD students; as such, contributors are expected to be cordial and professional with others.

Examples of behavior that contributes to creating a positive environment include:

-   Using welcoming and inclusive language
-   Being respectful of differing viewpoints and experiences
-   Gracefully accepting constructive criticism
-   Focusing on what is best for the community
-   Showing empathy towards other community members

Examples of unacceptable behavior by participants include:

-   The use of sexualized language or imagery and unwelcome sexual attention or advances
-   Trolling, insulting/derogatory comments, and personal or political attacks
-   Public or private harassment
-   Publishing others' private information, such as a physical or electronic address, without explicit permission
-   Other conduct which could reasonably be considered inappropriate in a professional setting

## Getting Started

This repository is for the main Jupiterp site, which is built with SvelteKit and TypeScript. In addition to this repository, other components of Jupiterp can be found in the [jupiterp-umd](https://github.com/jupiterp-umd) GitHub group, including:
- The [Jupiterp API](http://api.jupiterp.com/), an open-source API for getting course data
- The Jupiterp web-scraper, which collects course information to be used in the site
- The [@jupiterp/jupiterp](https://www.npmjs.com/package/@jupiterp/jupiterp/) npm package, which provides a TS interface wrapping the Jupiterp API

To get started on working on the site, see `README.md`.

### Finding Issues to Work On

You can navigate to the "Issues" tab above to find issues that need to be resolved. Feel free to work on any issues, although it is best not to work on issues already assigned to another contributor. Beginner-friendly issues are marked with the "good first issue" tag.

### Filing an Issue

If you discover a bug or other issue with Jupiterp, you can file an issue on the same "Issues" tab. You can add labels to your issue or assign other contributors, but refrain from doing so without an understanding of what the labels mean. Your labels may be removed or changed to more accurately reflect the issue.

## Contribution Process

### Making Changes

Changes should be made locally, rather than attempting to edit project code on GitHub. It is recommended that contributors keep a `main` branch which is synced with the `main` branch of Jupiterp in order to easily merge with other branches and resolve merge conflicts. Changes should be made on new branches and merged as is appropriate.

When you make changes, please abide by the style guide found in `STYLE.md`.

### Opening a Pull Request (PR)

If you are not finished with development on a task, but want to share your code or receive feedback or review, you can open up a draft pull request from your local or forked branch to a branch of Jupiterp. This can then be viewed by other contributors; when ready, the draft PR can be converted to a normal PR and merged, or closed.

If you are ready to merge changes on a local or forked branch to this repository, you can open a pull request (PR) on GitHub. In your pull request, provide a brief description of what your PR does and link any relevant issues rather than closing them.

### Code Review

When you open a pull request, you are required to receive approval from appropriate contributors in the code review process. You can also request a review from others, which is especially recommended if a particular contributor is especially knowledgeable of or responsible for an area of code you have altered.

### CI Jobs

When you open a pull request, your code will be subject to continuous integration (CI) test jobs. They ensure the code is linted, formatted, and passes all tests before merging. Refer to `STYLE.md` for more details.

## Communication

Currently, the Jupiterp community is small and has no official communications channels. If you have any inquiries, contact admin@jupiterp.com.
