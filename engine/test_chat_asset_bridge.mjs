import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourceText = await readFile(new URL("./chat_asset_bridge.js", import.meta.url), "utf8");
const moduleUrl = "data:text/javascript;base64," + Buffer.from(sourceText).toString("base64");
const {
  parseChatGPTExport,
  attachChatExport,
  confirmEdge,
  exportMemoryGraph,
  indicators
} = await import(moduleUrl);

const source = [{
  id: "conversation-hephaestus",
  title: "Hephaestus visual development",
  create_time: 1794668520,
  mapping: {
    first: {
      message: {
        id: "message-request",
        author: { role: "user" },
        create_time: 1794668520,
        content: { parts: ["Create a brawny handsome muscle-grown Hephaestus image."] }
      }
    },
    second: {
      message: {
        id: "message-approval",
        author: { role: "user" },
        create_time: 1794668580,
        content: { parts: ["Wonderful. Keep the image linked to its visual evidence."] }
      }
    },
    third: {
      message: {
        id: "message-attachment",
        author: { role: "user" },
        create_time: 1794668640,
        content: { parts: [{ content_type: "image_asset_pointer", asset_pointer: "file-image-01", file_name: "hephaestus.png" }] }
      }
    }
  }
}];

const parsed = parseChatGPTExport(source, "conversations.json");
assert.equal(parsed.length, 1);
assert.equal(parsed[0].messages.length, 3);
assert.equal(parsed[0].messages[0].role, "user");
assert.equal(parsed[0].messages[2].attachments.length, 1);

const graph = {
  nodes: [
    { id: "world-character-hephaestus", type: "world", title: "Hephaestus", description: "Forge-Maker deity and blacksmith" },
    { id: "asset-hephaestus-portrait", type: "asset", title: "Hephaestus Forge-Maker portrait", visual_kind: "image", availability: "archived" }
  ],
  edges: []
};
attachChatExport(graph, source, "conversations.json", false);
const suggestions = graph.edges.filter(edge => edge.status === "suggested");
assert.ok(suggestions.some(edge => edge.to === "world-character-hephaestus"), "distinctive character name should create a reviewable suggestion");
assert.ok(graph.nodes.some(node => node.type === "chat-attachment"), "attachment metadata should be preserved");
assert.equal(indicators(graph.nodes.find(node => node.id === "asset-hephaestus-portrait"), graph).visual, true);

const candidate = suggestions[0];
assert.equal(confirmEdge(graph, candidate.id, "Checked against source"), true);
assert.equal(graph.edges.find(edge => edge.id === candidate.id).status, "confirmed");

const exported = exportMemoryGraph(graph, true, false);
assert.ok(exported.nodes.every(node => !Object.hasOwn(node, "_fullText")));
assert.ok(exported.privacy.conversation_text_uploaded === false);
console.log("CHAT ASSET BRIDGE TESTS PASSED");
