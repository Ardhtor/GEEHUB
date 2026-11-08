# Finding and Generating Growth-Animation References

This guide describes how GEEHUB turns a discovery into a traceable production reference. The goal is not to collect links indiscriminately; it is to preserve the original work's identity, understand how it is made, and translate only observed properties into a repeatable production method.

## Begin with the source, not the style label

Search creator archives, public project pages, dated WIP posts, final releases, and supplied media. Search titles and series names as well as creator handles. Record the exact page or file, publication date when available, access state, and whether the actual media was opened. A post title, thumbnail, or creator description can establish metadata and intent, but cannot establish unobserved motion, sound, or visual detail.

For Hulum's Cave, use `research/hulums-cave/post-index.json` and `works.json` as the starting catalogue. Read the history chronologically and follow WIP-to-final relationships. Prioritize the forest work and its audio, Laboratory Growth and its extended growth WIPs, Loft Growth with sound, early shorts, and later generative experiments. Keep Hulum's Cave as the primary chronology; use other creators as comparisons.

## Record provenance before analysis

For every source, preserve:
- creator or archive identity and canonical URL
- title, publication date, and retrieval date
- access state: public, member-gated, unavailable, user-supplied, or locally synced
- original filename, storage path, provider file ID, and byte size
- SHA-256 when the bytes are available
- duration, frame rate, dimensions, codecs, and audio-stream metadata
- exact timestamps sampled and the tools or method used

Never claim direct inspection when only public metadata was visible. Never treat equal filenames or file sizes as proof of binary identity.

## Extract the work in layers

A useful source analysis separates temporal structure, camera, character, deformation, materials, environment, sound, and narrative function. Record what changes over time and what remains locked. For apparent growth, test whether silhouette changes are actually caused by pose, camera movement, orientation, crop, perspective, or lens. For audio, preserve the original track and note onset, duration, texture, pitch movement, transient shape, ambience, and synchronization. Do not reduce a sound-led work to silent frames.

When a project has WIPs and a final, compare the versions. Identify which changes are visible in the final, what was abandoned, and whether the creator describes a production change. Distinguish creator statements from your own technical interpretation.

## Translate into GEEHUB

A production handoff should state the source evidence, the feature being borrowed, and the new implementation. Typical handoffs include a reference-frame set, camera grammar, pose sequence, deformation curve, material response, sound layer, rig change, or short-form shot brief. Keep the original media untouched. Derived frames, audio studies, rigs, presets, and renders receive separate artifact records and link back to the source.

For Teal Titan, use the lineage record at `research/relationships/TEAL_TITAN_LINEAGE.json`. The Dropbox files `22`, `3333`, and `4444` and the anticipated fifth video are a user-defined sequence. Do not infer the contents of an uninspected item from its number. The character's Hulum's Cave × Joey lineage is a creative premise established by the user, not a claim about either person's private intentions or collaboration.

## Validation

Run:

```bash
python scripts/discover_creators.py --validate
python scripts/validate_research.py
```

The local discovery script currently validates and records manual intake. It does not perform live platform searches. Add network adapters only with explicit source attribution, access constraints, repeatable fixtures, and a clear record of which connectors actually ran.
