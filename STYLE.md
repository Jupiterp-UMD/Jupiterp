# Jupiterp Style Guide
This project does not have very strict style standards, but there are some rules in place to ensure the project is maintainable and can be understood by new contributors. Of course, there can be exceptions to this style guide, but generally please stick to these rules while working on Jupiterp.

## General style

In general, code should be as easy to read as possible by utilizing self-documenting code supplemented with comments as necessary. This means:

 - **Using descriptive variable names**
	 - An outsider should generally be able to understand the purpose of a variable if given only the name and minimal context.
	 - Avoiding unnecessary and unclear abbreviations and shortenings, but common shorthand like `iter` instead of `iterator` is fine.
	 - Variable names should be descriptive, but they also should not go into an unnecessary amount of detail. If you find yourself needing to make overly-specific variable names, you should consider reorganizing code so that some of the description can be abstracted to a variable's context
	 - Examples of good, descriptive variable names:
		 - `professor`
		 - `departmentsArray`
		 - `course_iterator` or `course_iter`
	 - Examples of poorly-chosen variable names
		 - `kazoo_eater` - unless Jupiterp pivots drastically in scope, this variable name will never be relevant to the function of a variable in Jupiterp
		 - `pfs` - this is using a shorthand which makes the purpose unclear
		 - `list_of_professors_with_associated_courses_and_department` - this variable name is overly specific and makes code difficult to use and read
 - **Organizing code logically**
	 - Adjacent code with shared purpose should be organized into the same function, while code serving a different purpose should be placed in a different one.
	 - Prefer a balanced paradigm; object-oriented programming can be useful, but avoid unnecessary OOP. Especially, avoid confusing inheritance hierarchies, design patterns, and overly-specific classes.
		 - The bare minimum is to avoid `PolymorphicDepartmentToCourseMapIteratorSingletonDecorator`.
 - **Use comments when useful**
	 - Comments are helpful to clarify your code, but they should be used sparingly. Generally, only use comments to explain *why* (not *what* or *how*) your code acts in a certain way. In some situations, code, even when written in a readable way, can be confusing; in these cases it may be helpful to provide an explanation of what a section of code is doing, but be sure to evaluate whether a comment is necessary.
	 - Use appropriate doc-tools to provide brief explanations of function parameters and return type or purpose. This is particularly helpful to users of IDEs like VSCode which can display those comments so they can understand what a function does without having to read the function code.
	 - Add documentation to the top of files to clarify their purpose without contributors needing to read through every function.
 - **Use TODO comments**
	 - For tasks that must be put off until after a commit or merge, mark places relevant to those tasks with `TODO` comments. These should include a relevant issue number and a brief description of the task. As an example:
		 - `//TODO(2): Investigate sharing HTTP requests between calls to this fn.` where issue #2 is to investigate sharing HTTP requests as described in the comment.

Lastly, add a comment to all code files specifying that the file is part of Jupiterp.
In JS/TS:
```js
/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 * 
 */
```
And in all HTML or Svelte files:
```html
<!-- 
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).

-->
```

## JavaScript/TypeScript

For lints, Jupiterp uses ESLint. You can use this by navigating to the `site` folder and running `npm run lint`.

The rules for formatting are not too controlling, but generally:
- Group relevant imports
- Use single quotes `'` rather than double quotes `"` for strings
- Mark variable types, especially for custom types, classes, or interfaces
- Provide ample vertical whitespace; avoid long chains of function calls on the same line
- Keep lines to 80 characters maximum, unless doing so would make code more unreadable

Otherwise, use best judgement in what is readable, maintainable formatting, and be open to discussion with other contributors on formatting your code.