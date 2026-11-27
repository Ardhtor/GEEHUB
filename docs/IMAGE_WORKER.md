# GEEHUB Image Worker

The main GEEHUB page contains a visual worker for new image generation and source-conditioned editing.

When a source image is selected, RUN creates an `IMAGE_TO_IMAGE` job and posts the selected image to the configured Automatic1111-compatible `/sdapi/v1/img2img` endpoint. With no source selected, it continues to use `/sdapi/v1/txt2img`.

The current edit prompt is set up for the supplied car portrait: preserve the same adult man, face, beard, expression, pose, hands, car interior, window view, lighting and framing while substantially enlarging the pectorals and proportionally supporting upper-body muscles. The edit-strength control defaults to 0.45. Lower values retain more of the source; higher values allow larger changes but increase the chance of identity or scene drift.

The source file is selected in the browser. Its bytes are sent directly to the configured local image engine and are not committed to GitHub or copied into the canonical JSON job queue. The job record retains the prompt, source filename and technical metadata, mode, endpoint and edit strength. A returned image is shown in the worker, offered for saving, and emitted into GEEHUB's artifact and interaction channels.

The default endpoint is `http://127.0.0.1:7860`. The local engine must be running with its API enabled and must permit the browser origin to make requests. A queued job that reports `WAITING_FOR_ENGINE` is retained; it is not a completed render.
