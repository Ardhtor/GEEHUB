# GEEHUB // DROPBOX BRIDGE

Dropbox is the persistent production layer.

The autonomous engine produces locally inside the GitHub Actions workspace. When a Dropbox access token is configured as the repository secret `DROPBOX_ACCESS_TOKEN`, the workflow can persist the generated production package into Dropbox.

Until that credential exists, the engine must never pretend that Dropbox persistence occurred. It writes the same package to `dropbox_outbox/` so the production state remains explicit and recoverable.

The intended Dropbox root is:

`/GEEHUB/`

Production packages should retain lineage:

source -> action -> artifact -> memory

The cloud copy is not a log. It is the durable world surface.
