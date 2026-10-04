# GEEHUB LONG PLAY

The browser PLAY loop and the scheduled GitHub runner are the same world process at different scales.

The scheduled runner fires every 15 minutes and:

`inherit state → rotate agent → advance spatial recording → queue image → queue 3D/video/sound → append exchange → commit`

It never resets the map or previous recordings.

The runner does not pretend that a renderer completed a job. A renderer job remains `QUEUED` until an actual renderer returns media.

Manual starts are available through GitHub Actions workflow dispatch.

This is the persistent world clock.