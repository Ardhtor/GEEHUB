/**
 * Runtime capability registry. GEEHUB can orchestrate only tools actually
 * registered by an adapter. Missing capabilities remain explicit blockers.
 */
export const CAPABILITY_GROUPS = Object.freeze({
  inspect: ["video-metadata", "frame-extraction", "scene-detection", "audio-analysis"],
  understand: ["person-segmentation", "face-tracking", "body-landmarks", "camera-tracking", "depth-estimation"],
  construct: ["image-generation", "video-generation", "mesh-generation", "rig-generation", "material-generation", "environment-generation"],
  edit: ["timeline-edit", "retiming", "transitions", "audio-edit", "compositing"],
  transform: ["identity-preserving-video-edit", "mesh-deformation", "garment-simulation", "environment-reaction", "relighting"],
  finish: ["video-render", "audio-mix", "mp4-export"]
});

export class CapabilityRegistry {
  #adapters = new Map();
  register({ id, capabilities = [], adapter, limits = {} }) {
    if (!id || !adapter) throw new TypeError("Adapter id and implementation are required");
    for (const capability of capabilities) {
      if (!Object.values(CAPABILITY_GROUPS).flat().includes(capability)) throw new Error("Unknown capability: " + capability);
      const list = this.#adapters.get(capability) ?? [];
      list.push({ id, adapter, limits });
      this.#adapters.set(capability, list);
    }
    return this;
  }
  providers(capability) { return (this.#adapters.get(capability) ?? []).map(({ id, limits }) => ({ id, limits })); }
  has(capability) { return (this.#adapters.get(capability)?.length ?? 0) > 0; }
  resolve(capability) { return this.#adapters.get(capability)?.[0] ?? null; }
  inventory() {
    return Object.fromEntries(Object.values(CAPABILITY_GROUPS).flat().map(key => [key, this.providers(key)]));
  }
}

export function createCapabilityReport(registry, required = []) {
  const capabilities = [...new Set(required)];
  return {
    ready: capabilities.filter(name => registry.has(name)),
    missing: capabilities.filter(name => !registry.has(name)),
    inventory: registry.inventory()
  };
}

export async function executeCapability(registry, capability, input, context = {}) {
  const provider = registry.resolve(capability);
  if (!provider) return { status: "blocked", capability, reason: "No connected provider implements this capability." };
  try {
    const output = await provider.adapter.execute({ capability, input, context, limits: provider.limits });
    return { status: "completed", capability, provider: provider.id, output };
  } catch (error) {
    return { status: "failed", capability, provider: provider.id, error: String(error?.message ?? error) };
  }
}
