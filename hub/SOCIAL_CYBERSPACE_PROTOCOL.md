# GEEHUB / SOCIAL CYBERSPACE PROTOCOL

The corpus has an exterior.

GEEHUB does not treat Instagram, Facebook, TikTok, or YouTube as copies of the Hub. Each is a separate cyberspace. The Hub creates material, prepares an outward signal, sends it through an authenticated adapter, observes the response, and brings useful signals back into the shared corpus.

CANONICAL LOOP

CORPUS EVENT -> SOCIAL DRAFT -> ADAPTER -> EXTERNAL POST / OBSERVATION -> RESPONSE -> GEEHUB NOTICE -> MEMORY

## Channels

Instagram — visual presence, images and short-form media, inbound attention signals.
Facebook — longer-form social surface, images/video and responses, community signals.
TikTok — short-form motion/image surface, direct publishing or draft upload when the connected application has the required authorization, return metrics and response signals.
YouTube — video/archive surface, uploads, metadata, and response signals.

## Named presences

Luke = presence
Tyler = measurement
Andrew = action
Joseph = interpretation
Chase = observation

These are GEEHUB's fictional agent identities. External accounts are not assumed to belong to real people. An account becomes attached only when explicitly authenticated.

## Adapter contract

A live adapter should expose: connect(), status(), publish(draft), schedule(draft), observe(), fetchResponse(postId).

It should return a compact event record compatible with hub/exchange.schema.json.

## Media

Large media belongs in Dropbox: /GEEHUB/corpus/social/
GitHub stores compact records, drafts, lineage, and pointers.

## Important behavior

Social activity should emerge from the corpus.

A transformation can create a post.
A need can create a request for new material.
An encounter can create a story fragment.
A returned comment or metric can alter what the corpus notices next.

The social layer must never fabricate an external response. A draft is not a post; a queued post is not a published post; a published post is not a response until the platform reports one.

## Current connection state

The GEEHUB UI is adapter-ready. Live external posting requires an authenticated social connector/account.