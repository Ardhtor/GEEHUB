# Geo-Anchored Local Cyberspace

A locality-first runtime for a persistent digital world anchored to a physical region.

## v0.1 production boundary

The local machine is authoritative for world state. Network services are optional consumers behind an explicit export boundary.

```text
physical region
      |
      v
local world database
      |
      +--> events
      +--> nodes
      +--> relationships
      +--> environment
                |
                v
          context engine
                |
                v
              agent
                |
                v
           output gate
            /       \
         local    network
```

## Core records

- **Node**: person, place, object, agent, or other entity.
- **Event**: timestamped activity or environmental observation.
- **Relationship**: typed edge between nodes.
- **Context projection**: the subset of local state an agent is permitted to consume.

Every record can carry locality, provenance, sensitivity, permissions, and retention metadata.

## Design rule

Sensitive or intimate activity is representable as local data without making remote publication a prerequisite. Output restrictions belong at the presentation/transmission boundary rather than being baked into the underlying data model.

The initial implementation is intentionally storage-and-schema first. Environmental feeds, richer geographic models, additional agents, and transformation systems can be added without changing the locality boundary.
