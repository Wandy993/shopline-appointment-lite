# Safe Mac ZIP overlay and deployment command

The final answer includes the same copyable command with the generated ZIP's exact filename. This procedure:

- validates the ZIP before touching the target;
- creates a Git backup commit when the target already has files;
- extracts into a retained temporary directory;
- overlays with `rsync` without deleting unrelated target files;
- installs packages and runs tests/checks;
- prints `git status`;
- contains opt-in Railway and Theme Extension push steps;
- does not use `set -e`, so an error prints clearly and the terminal stays open;
- preserves the temporary extraction directory on failure.

Run from the destination project directory. It refuses to operate on `/` or your home directory. Deployment is opt-in:

```bash
DEPLOY_RAILWAY=1 PUSH_THEME=1 bash ...
```

`PUSH_THEME=1` only works after `sl extension create --name theme-app-extension` has created and associated the real extension.
