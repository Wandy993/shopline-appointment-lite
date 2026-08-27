# v0.6.0.5 Clean Release

This clean release keeps the v0.6.0.5 application behavior unchanged and fixes stale test assertions that hard-coded the previous Theme Extension version (`0.6.0.4`).

Runtime/version regression assertions now derive the expected version from `package.json`, preventing the same false failure on future releases.
