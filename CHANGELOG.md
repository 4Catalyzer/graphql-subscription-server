## [3.0.3](https://github.com/4Catalyzer/graphql-subscription-server/compare/v3.0.2...v3.0.3) (2021-06-09)


### Bug Fixes

* use old message names ([8dc6a1d](https://github.com/4Catalyzer/graphql-subscription-server/commit/8dc6a1ddb59a569001415ccad7ec0b2753695c48))





## [3.0.2](https://github.com/4Catalyzer/graphql-subscription-server/compare/v3.0.1...v3.0.2) (2021-06-09)


### Bug Fixes

* race condition causing memory leak ([#417](https://github.com/4Catalyzer/graphql-subscription-server/issues/417)) ([8a5675c](https://github.com/4Catalyzer/graphql-subscription-server/commit/8a5675ce0dfd0852c955655d473c78ebd7d725ea))





## [3.0.1](https://github.com/4Catalyzer/graphql-subscription-server/compare/v3.0.0...v3.0.1) (2021-05-25)


### Bug Fixes

* build ([60a1224](https://github.com/4Catalyzer/graphql-subscription-server/commit/60a1224778eb2e83c62e9bfdf7e9026fee9d8392))





# [2.0.0](https://github.com/4Catalyzer/graphql-subscription-server/compare/v1.2.1...v2.0.0) (2020-11-25)


* fix!: socket io v3 update (#392) ([0c4ff42](https://github.com/4Catalyzer/graphql-subscription-server/commit/0c4ff42a0ac43650d99b8dbdf94247dca6204f13)), closes [#392](https://github.com/4Catalyzer/graphql-subscription-server/issues/392)


### BREAKING CHANGES

* socket io v3 update

* add a manual releases file for staging manual releases

* Revert "BREAKING CHANGE: socket io v3 update"

This reverts commit 236ee123139744c17f83a170860bd4b3e4089f1e.

* linting

## [1.2.1](https://github.com/4Catalyzer/graphql-subscription-server/compare/v1.2.0...v1.2.1) (2020-11-23)


### Bug Fixes

* force patch release ([67f5b63](https://github.com/4Catalyzer/graphql-subscription-server/commit/67f5b63eed00ff85692dcc88a35a6c74b65d5360))

# [1.2.0](https://github.com/4Catalyzer/graphql-subscription-server/compare/v1.1.0...v1.2.0) (2020-11-16)


### Features

* log connect and subscribed events ([#354](https://github.com/4Catalyzer/graphql-subscription-server/issues/354)) ([b9a109c](https://github.com/4Catalyzer/graphql-subscription-server/commit/b9a109c7b27159cd024ab4a31e0f6d1f6ecf81a0))

# [1.1.0](https://github.com/4Catalyzer/graphql-subscription-server/compare/v1.0.1...v1.1.0) (2020-07-21)


### Features

* Acknowledge unsubscribe requests ([#367](https://github.com/4Catalyzer/graphql-subscription-server/issues/367)) ([a2c24a8](https://github.com/4Catalyzer/graphql-subscription-server/commit/a2c24a8530c97f6fdbb51220d95f0c81e7deeb0a))

## [1.0.1](https://github.com/4Catalyzer/graphql-subscription-server/compare/v1.0.0...v1.0.1) (2020-06-08)


### Bug Fixes

* await credentials when subscribing ([#351](https://github.com/4Catalyzer/graphql-subscription-server/issues/351)) ([df9f3a8](https://github.com/4Catalyzer/graphql-subscription-server/commit/df9f3a85047c78eabaaa0a0562a3dfce5bdcdbb2))

# [1.0.0](https://github.com/4Catalyzer/graphql-subscription-server/compare/v0.11.0...v1.0.0) (2020-05-18)


* fix!: improve exports and abstract class (#346) ([c86d4e0](https://github.com/4Catalyzer/graphql-subscription-server/commit/c86d4e08b324d4c31c3f7350c4395f98bad87bfe)), closes [#346](https://github.com/4Catalyzer/graphql-subscription-server/issues/346)


### BREAKING CHANGES

* convert to typescript

# [0.11.0](https://github.com/4Catalyzer/graphql-subscription-server/compare/v0.10.1...v0.11.0) (2020-05-18)


### Features

* convert to typescript ([#344](https://github.com/4Catalyzer/graphql-subscription-server/issues/344)) ([d70ff30](https://github.com/4Catalyzer/graphql-subscription-server/commit/d70ff30))

## [0.10.1](https://github.com/4Catalyzer/graphql-subscription-server/compare/v0.10.0...v0.10.1) (2020-05-04)

### Bug Fixes

- Export options types ([#339](https://github.com/4Catalyzer/graphql-subscription-server/issues/339)) ([9faabd6](https://github.com/4Catalyzer/graphql-subscription-server/commit/9faabd6))

# [0.10.0](https://github.com/4Catalyzer/graphql-subscription-server/compare/v0.9.0...v0.10.0) (2020-05-03)

### Features

- Expose subscriber to subscription ([#337](https://github.com/4Catalyzer/graphql-subscription-server/issues/337)) ([5d164d9](https://github.com/4Catalyzer/graphql-subscription-server/commit/5d164d9))

# [0.9.0](https://github.com/4Catalyzer/graphql-subscription-server/compare/v0.8.2...v0.9.0) (2019-04-02)

### Features

- Allow subscription-level override of authorization check function ([#37](https://github.com/4Catalyzer/graphql-subscription-server/issues/37)) ([d5c7aaa](https://github.com/4Catalyzer/graphql-subscription-server/commit/d5c7aaa))

## [0.8.2](https://github.com/4Catalyzer/graphql-subscription-server/compare/v0.8.1...v0.8.2) (2019-03-20)

### Bug Fixes

- Update dependencies ([#34](https://github.com/4Catalyzer/graphql-subscription-server/issues/34)) ([1600040](https://github.com/4Catalyzer/graphql-subscription-server/commit/1600040))

<a name="0.8.1"></a>

## [0.8.1](https://github.com/4Catalyzer/graphql-subscription-server/compare/v0.8.0...v0.8.1) (2019-02-26)

### Bug Fixes

- Fix typing ([#22](https://github.com/4Catalyzer/graphql-subscription-server/issues/22)) ([cb44cf0](https://github.com/4Catalyzer/graphql-subscription-server/commit/cb44cf0))

<a name="0.8.0"></a>

# [0.8.0](https://github.com/4Catalyzer/graphql-subscription-server/compare/v0.7.1...v0.8.0) (2018-08-13)

### Features

- Use an explicitly closeable async iterator ([#20](https://github.com/4Catalyzer/graphql-subscription-server/issues/20)) ([4408ddf](https://github.com/4Catalyzer/graphql-subscription-server/commit/4408ddf))

<a name="0.7.1"></a>

## [0.7.1](https://github.com/4Catalyzer/graphql-subscription-server/compare/v0.7.0...v0.7.1) (2018-08-13)

### Bug Fixes

- Fix subscribe error handling ([#21](https://github.com/4Catalyzer/graphql-subscription-server/issues/21)) ([fe9308b](https://github.com/4Catalyzer/graphql-subscription-server/commit/fe9308b))

<a name="0.6.0"></a>

# [0.6.0](https://github.com/4Catalyzer/graphql-subscription-server/compare/v0.5.0...v0.6.0) (2018-05-24)

### Features

- Create new context for each event ([e24b1a3](https://github.com/4Catalyzer/graphql-subscription-server/commit/e24b1a3))

<a name="0.5.0"></a>

# [0.5.0](https://github.com/4Catalyzer/graphql-subscription-server/compare/v0.4.0...v0.5.0) (2018-05-22)

### Features

- use native async generators/iterators ([#16](https://github.com/4Catalyzer/graphql-subscription-server/issues/16)) ([b44c08e](https://github.com/4Catalyzer/graphql-subscription-server/commit/b44c08e))

<a name="0.4.0"></a>

# [0.4.0](https://github.com/4Catalyzer/graphql-subscription-server/compare/v0.3.0...v0.4.0) (2018-05-04)

### Features

- add main exports ([#15](https://github.com/4Catalyzer/graphql-subscription-server/issues/15)) ([03e549e](https://github.com/4Catalyzer/graphql-subscription-server/commit/03e549e))

<a name="0.3.0"></a>

# [0.3.0](https://github.com/4Catalyzer/graphql-subscription-server/compare/v0.2.0...v0.3.0) (2018-04-19)

### Features

- Standarize error handling for subscription limits ([#14](https://github.com/4Catalyzer/graphql-subscription-server/issues/14)) ([a07172b](https://github.com/4Catalyzer/graphql-subscription-server/commit/a07172b))

<a name="0.2.0"></a>

# [0.2.0](https://github.com/4Catalyzer/graphql-subscription-server/compare/v0.1.1...v0.2.0) (2018-04-18)

### Features

- **logging:** expliclty log updates ([08c5f8f](https://github.com/4Catalyzer/graphql-subscription-server/commit/08c5f8f))
