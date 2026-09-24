# Comapeo Backend Ethos

## tl;dr

Keep it simple, catch edge cases early.

## Why?

This document is used to inform new contributors wanting to either or code or to review pull requests. Having a set of goals for how we conduct the backend of Comapeo helps us maintain the level of quality we seek and ease uncertainty in choosing between approaches.

## Make it easy to use

Our goal is to enable others to build on top of the core without running into friction. To support this we want to reduce complexity and API surface and to keep things consistant.

## Type Safety

We want to have type safety on all our APIs for a few reasons. The first is that it helps the front end team build more quickly. Type annotations enable autocomplete suggestions and let developers quickly search up names without having to exit their code flow. Type annotations also make it ovious if fields are missing or get changed by surfacing errors in downstream code. It lets us perform refactors without needing to worry as much about updating parts of dependant code.

We use [JSDoc](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html) type annotations on top of raw JavaScript so we can avoid needing build steps in order to use the code. We run our code through the TypeScript type checker to make sure nothing is missing.

Despite aiming to use types, it's okay to step by errors if you're 100% sure it's okay (e.g. type matching in unit tests). Make sure to add a detailed comment on why any ignored errors weren't just fixed.

## Validation

We handle data from potentially untrusted (or differently versioned sources). As such we need to validate everything at runtime with struct schemas and backwards / forwards compatability. Testing accross versions is important. This is separate from the type validation in the APIs since we can assume the rest of the codebase is performing type checks before sending data to the backend.

## Testing

We aim to cover not just the basic tests for new features, but also potential edge cases. When looking at new code or changes, think about what would happen if the versions were mismatched, if one or more peers are offline, and if events happen in different order or have race conditions.

## Code style / maintainability

- Be less clever and more readable
- Don't assign functions to mutable variables
- Explicit variable names are better than short ones
- Add code comments to explain why things work the way they do
- Prefer classes with constructors over factory functions
- Use `SomeValue | undefined` instead of `SomeValue | null`
- Make sure uncaught errors cannot crash the process, log them if there's no better option
- Use the `ensureError` utility if TypeScript complains about error types
- Be extra weary of adding new methods / properties to `MapeoProject`, prefix then with `$` and leave unprefixed fields to the replicated DataTypes
