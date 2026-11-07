# The Tractus self-starting engine

The Tractus has two complementary autonomous rhythms. The existing world
engine runs every fifteen minutes, advancing world state, campus life, the
environmental stream, and durable production records. The narrative engine
added here runs every six hours and can also be started manually from the
repository's Actions tab. Each successful narrative cycle reads the broader
continuity corpus, selects one live thread from the narrative queue, asks the
configured model for one contribution, validates it, appends it to one approved
manuscript or lore file, and creates its own Git commit. The two engines have
separate concurrency groups and distinct outputs.

## One-time setup

In the GitHub repository, open **Settings → Secrets and variables → Actions**.

1. Add a repository secret named `OPENAI_API_KEY` containing an API key for an
   OpenAI API project. This is separate from a ChatGPT subscription.
   API usage is billed separately by the API provider; set an API budget or
   usage limit on that project before enabling the schedule.
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
- One of four approved destinations can be appended: the current Book I
  continuation, `DEEP_LORE.md`, `ECONOMY_OF_FAVOURS.md`, or
  `GOD_PENIS_IDOL_CYCLE.md`.
- Read-only context includes the fiction-engine contract, editorial and
  relationship canon, the current manuscript, world pulse stream, attention
  engine, campus state, and `engine/tractus_narrative_queue.json`.
- The queue keeps the main manuscript, romance and domestic life, Northgate
  campus, the idol cycle, and institutional worldbuilding available as distinct
  continuation lanes. Romance and domestic life currently have first priority.
- Recent commits are supplied to the selector so it can rotate between lanes
  instead of repeatedly writing into the same destination.
- Manuscript chapters are automatically numbered from the latest chapter and
  target 3,500–5,500 words; lore additions target 900–1,500 words.
- The model cannot choose arbitrary paths, edit code or workflows, delete files,
  or execute commands.
- Chapter output is limited to 12,000 characters and checked before writing.
- The workflow compiles the Python runner and validates the campus JSON before
  contacting the model.
- Pushes retry against the latest branch state; a rebase conflict stops safely
  instead of overwriting concurrent work.
- Existing chapters are never replaced. Duplicate chapter headings are skipped.
- A concurrency lock prevents overlapping scheduled/manual runs.
- The runner refuses to mix generated work with a dirty checkout.
- The workflow has repository-content write permission only.

This remains a bounded narrative writer, not unrestricted repository control.
The fifteen-minute world engine supplies recurring world activity; the six-hour
writer turns selected continuity pressures into manuscript chapters. The queue
is editable by the project owner, so new priorities can be introduced without
changing the runner. Future additions can add a continuity audit, asset-index
maintenance, and project-specific production cycles behind similarly narrow
permissions.

## Files

- Workflow: `.github/workflows/tractus-engine.yml`
- Runner: `scripts/tractus_engine.py`
- Narrative queue: `engine/tractus_narrative_queue.json`
- Existing world engine: `.github/workflows/world-engine.yml`
