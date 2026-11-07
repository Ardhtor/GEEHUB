# The Tractus self-starting engine

The Tractus now has a scheduled GitHub Actions entry point and a bounded writing
runner. The workflow starts on a six-hour schedule and can also be started
manually from the repository's Actions tab. Each successful cycle asks the
configured model for one continuity-aware contribution, validates it, appends
it to one approved lore file, and creates its own Git commit.

## One-time setup

In the GitHub repository, open **Settings → Secrets and variables → Actions**.

1. Add a repository secret named `OPENAI_API_KEY` containing an API key for an
   OpenAI API project. This is separate from a ChatGPT subscription.
2. Add a repository variable named `TRACTUS_MODEL` containing a model ID that
   is enabled for that API project and supports the Responses API.
3. Confirm that GitHub Actions is enabled for the repository and that the
   workflow is allowed to write repository contents.

Do not put the API key in a file, workflow variable, commit, or issue. The
workflow reads it only from the Actions secret store.

## Starting and checking it

Open **Actions → The Tractus — self-starting engine**. Choose **Run workflow**.
For the first run, set `dry_run` to true. A dry run calls the model and checks
the proposed chapter but does not edit or commit anything. Once that succeeds,
run it again with `dry_run` false. The scheduled workflow then runs every six
hours (at minute 17), provided the repository's Actions settings and API
configuration remain valid.

The run log reports whether the engine created a commit, skipped because there
was no worthwhile continuation, or stopped because configuration or validation
failed. The commit appears in the ordinary Git history and links to the changed
lore file.

## Operating boundaries

- One chapter at most per cycle; no recursive or runaway generation.
- One of three approved lore files can be appended: `DEEP_LORE.md`,
  `ECONOMY_OF_FAVOURS.md`, or `GOD_PENIS_IDOL_CYCLE.md`.
- The model cannot choose arbitrary paths, edit code or workflows, delete files,
  or execute commands.
- Chapter output is limited to 12,000 characters and checked before writing.
- Existing chapters are never replaced. Duplicate chapter headings are skipped.
- A concurrency lock prevents overlapping scheduled/manual runs.
- The runner refuses to mix generated work with a dirty checkout.
- The workflow has repository-content write permission only.

This is an intentionally small first engine: it gives The Tractus a reliable
heartbeat and a visible commit trail without granting the model unrestricted
control of the repository. Future engines can add separate continuity audits,
asset indexing, and project-specific cycles behind similarly narrow permissions.

## Files

- Workflow: `.github/workflows/tractus-engine.yml`
- Runner: `scripts/tractus_engine.py`
