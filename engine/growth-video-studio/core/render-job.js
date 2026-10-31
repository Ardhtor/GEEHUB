import { validateGrowthSequence } from "./growth-state.js";
import { validateLandmarkTrack } from "./landmark-track.js";

/** Create a portable renderer job; no render is claimed until an adapter returns an artifact. */
export function createRenderJob({source,growthStates,landmarkFrames,settings={}}) {
  const errors=[];
  if (!source || typeof source.name!=="string" || !source.name) errors.push("Source video reference is required");
  if (!Number.isFinite(source?.duration) || source.duration<=0) errors.push("Source duration must be positive");
  if (!Number.isInteger(source?.width) || source.width<1 || !Number.isInteger(source?.height) || source.height<1) errors.push("Source dimensions are required");
  const growth=validateGrowthSequence(growthStates);
  if (!growth.valid) errors.push(...growth.errors.map(e=>`Growth: ${e}`));
  const tracking=validateLandmarkTrack(landmarkFrames,settings.tracking);
  if (!tracking.valid) errors.push(...tracking.errors.map(e=>`Tracking: ${e}`));
  const fps=settings.fps??24;
  if (!Number.isInteger(fps)||fps<1||fps>120) errors.push("FPS must be an integer from 1 to 120");
  if (errors.length) return {valid:false,errors,job:null};
  return {
    valid:true,errors:[],
    job:{
      schema:"geehub.growth-render-job",
      schemaVersion:1,
      status:"ready-for-renderer",
      source:{...source},
      output:{width:source.width,height:source.height,fps,format:settings.format??"mp4"},
      growthStates:growthStates.map(s=>({id:s.id,parentId:s.parentId,body:{...s.body}})),
      landmarkFrames,
      constraints:{
        protectFace:true,
        preserveSourceMotion:true,
        preserveGroundContact:true,
        deformBodyAsConnectedMesh:true,
        garmentResponse:true,
        environmentResponse:true,
        temporalStability:true
      },
      createdAt:new Date().toISOString()
    }
  };
}
