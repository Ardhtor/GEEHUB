# Geo-Cyberspace Architecture v0.2

The system is a local data architecture first. Geography is represented as data locality, not as a metaphorical layer.

## Pipeline

```text
columns
  |
  v
local records
  |
  +--> nodes
  +--> events / tracce
  +--> relationships / relazioni
  |
  v
heuristics
  |
  v
context projection / contesto
  |
  v
agent decision
  |
  v
output gate
  +--> local
  +--> explicitly exported network
```

## Boundaries

1. Storage is authoritative locally.
2. Heuristics operate only on records available to the current context.
3. Permissions and sensitivity are gates, not ranking weights.
4. A remote source never becomes local merely because it is useful.
5. Export is an explicit transition from local state to network-visible state.
6. Missing information remains unknown.

## Semantic naming

The implementation may use small Italian semantic aliases where they make the code easier to read: `luogo`, `traccia`, `presenza`, `relazione`, `contesto`, and `memoria`. These names describe ordinary system concepts; they do not introduce a separate ontology.

## Sacrality boundary

Sacrality is outside the storage and heuristic core. If a future presentation or cultural layer needs sacred semantics, it consumes ordinary records through the same context and permission boundaries. The systems architecture itself remains secular and testable.
