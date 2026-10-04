# RECORDING AS WORLD CONTRACT

The recording packet is the common input to every renderer.

A worker does not need to reconstruct GEEHUB from prose. It loads:

1. the canonical map
2. the referenced region
3. the recorded coordinates
4. the camera
5. the current subject scale
6. environmental state
7. persistent anchors
8. state deltas

The renderer produces media or a geometry/material delta and returns the recording ID as lineage.

The canonical map remains upstream. A rendering can change the world through a returned delta, but it cannot silently replace the geography.

Core flow:

`RECORD → QUEUE → RENDER → RETURN MEDIA → REGISTER LINEAGE → INHERIT`
