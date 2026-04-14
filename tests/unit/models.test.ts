import { expect, test } from "@playwright/test";
import {
  DEFAULT_CHAT_MODEL,
  allowedModelIds,
  chatModels,
  getActiveModels,
  getAllGatewayModels,
  getCapabilities,
  modelsByProvider,
} from "../../lib/ai/models";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FetchMockResponse = Partial<Response> & {
  ok: boolean;
  json?: () => Promise<unknown>;
};

function mockFetch(response: FetchMockResponse): () => void {
  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => response as Response;
  return () => {
    globalThis.fetch = origFetch;
  };
}

function mockFetchThrows(): () => void {
  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Network error");
  };
  return () => {
    globalThis.fetch = origFetch;
  };
}

test.describe("chatModels constant", () => {
  test("is a non-empty array", () => {
    expect(Array.isArray(chatModels)).toBe(true);
    expect(chatModels.length).toBeGreaterThan(0);
  });

  test("every model has required string fields", () => {
    for (const model of chatModels) {
      expect(typeof model.id).toBe("string");
      expect(model.id.length).toBeGreaterThan(0);
      expect(typeof model.name).toBe("string");
      expect(model.name.length).toBeGreaterThan(0);
      expect(typeof model.provider).toBe("string");
      expect(model.provider.length).toBeGreaterThan(0);
      expect(typeof model.description).toBe("string");
    }
  });

  test("model id follows provider/name format", () => {
    for (const model of chatModels) {
      expect(model.id).toContain("/");
      const [provider] = model.id.split("/");
      expect(provider).toBeTruthy();
    }
  });

  test("models with reasoningEffort have a valid value", () => {
    const validEfforts = ["none", "minimal", "low", "medium", "high"];
    for (const model of chatModels) {
      if (model.reasoningEffort !== undefined) {
        expect(validEfforts).toContain(model.reasoningEffort);
      }
    }
  });
});

test.describe("DEFAULT_CHAT_MODEL", () => {
  test("is a non-empty string", () => {
    expect(typeof DEFAULT_CHAT_MODEL).toBe("string");
    expect(DEFAULT_CHAT_MODEL.length).toBeGreaterThan(0);
  });

  test("corresponds to an existing model in chatModels", () => {
    const ids = chatModels.map((m) => m.id);
    expect(ids).toContain(DEFAULT_CHAT_MODEL);
  });
});

test.describe("allowedModelIds", () => {
  test("is a Set", () => {
    expect(allowedModelIds).toBeInstanceOf(Set);
  });

  test("contains all chatModel ids", () => {
    for (const model of chatModels) {
      expect(allowedModelIds.has(model.id)).toBe(true);
    }
  });

  test("size matches number of chatModels", () => {
    expect(allowedModelIds.size).toBe(chatModels.length);
  });
});

test.describe("modelsByProvider", () => {
  test("groups every model under its provider", () => {
    for (const model of chatModels) {
      expect(modelsByProvider[model.provider]).toBeDefined();
      const ids = modelsByProvider[model.provider].map((m) => m.id);
      expect(ids).toContain(model.id);
    }
  });

  test("each provider bucket contains ChatModel objects", () => {
    for (const [, models] of Object.entries(modelsByProvider)) {
      for (const m of models) {
        expect(m.id).toBeTruthy();
        expect(m.name).toBeTruthy();
        expect(m.provider).toBeTruthy();
      }
    }
  });
});

test.describe("getActiveModels()", () => {
  test("returns the chatModels array", () => {
    expect(getActiveModels()).toEqual(chatModels);
  });

  test("returns a non-empty array", () => {
    expect(getActiveModels().length).toBeGreaterThan(0);
  });
});

test.describe("getAllGatewayModels()", () => {
  test("returns empty array when fetch throws", async () => {
    const restore = mockFetchThrows();
    try {
      const result = await getAllGatewayModels();
      expect(result).toEqual([]);
    } finally {
      restore();
    }
  });

  test("returns empty array on non-ok HTTP response", async () => {
    const restore = mockFetch({ ok: false, json: async () => ({}) });
    try {
      const result = await getAllGatewayModels();
      expect(result).toEqual([]);
    } finally {
      restore();
    }
  });

  test("filters out non-language models", async () => {
    const restore = mockFetch({
      ok: true,
      json: async () => ({
        data: [
          { id: "openai/gpt-4", name: "GPT-4", type: "language", tags: [] },
          { id: "openai/dall-e-3", name: "DALL-E 3", type: "image", tags: [] },
        ],
      }),
    });
    try {
      const result = await getAllGatewayModels();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("openai/gpt-4");
    } finally {
      restore();
    }
  });

  test("maps capabilities from tags", async () => {
    const restore = mockFetch({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "openai/gpt-4",
            name: "GPT-4",
            type: "language",
            tags: ["tool-use", "vision", "reasoning"],
          },
        ],
      }),
    });
    try {
      const [model] = await getAllGatewayModels();
      expect(model.capabilities.tools).toBe(true);
      expect(model.capabilities.vision).toBe(true);
      expect(model.capabilities.reasoning).toBe(true);
    } finally {
      restore();
    }
  });

  test("sets false capabilities when tags are missing", async () => {
    const restore = mockFetch({
      ok: true,
      json: async () => ({
        data: [{ id: "openai/gpt-4", name: "GPT-4", type: "language" }],
      }),
    });
    try {
      const [model] = await getAllGatewayModels();
      expect(model.capabilities.tools).toBe(false);
      expect(model.capabilities.vision).toBe(false);
      expect(model.capabilities.reasoning).toBe(false);
    } finally {
      restore();
    }
  });

  test("derives provider from the model id", async () => {
    const restore = mockFetch({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "anthropic/claude-3",
            name: "Claude 3",
            type: "language",
            tags: [],
          },
        ],
      }),
    });
    try {
      const [model] = await getAllGatewayModels();
      expect(model.provider).toBe("anthropic");
    } finally {
      restore();
    }
  });
});

test.describe("getCapabilities()", () => {
  test("returns capabilities for every chatModel on success", async () => {
    const restore = mockFetch({
      ok: true,
      json: async () => ({
        data: {
          endpoints: [{ supported_parameters: ["tools", "reasoning"] }],
          architecture: { input_modalities: ["image", "text"] },
        },
      }),
    });
    try {
      const caps = await getCapabilities();
      expect(Object.keys(caps)).toHaveLength(chatModels.length);
      for (const model of chatModels) {
        expect(caps[model.id]).toBeDefined();
        expect(caps[model.id].tools).toBe(true);
        expect(caps[model.id].vision).toBe(true);
        expect(caps[model.id].reasoning).toBe(true);
      }
    } finally {
      restore();
    }
  });

  test("returns false capabilities for all models when fetch throws", async () => {
    const restore = mockFetchThrows();
    try {
      const caps = await getCapabilities();
      for (const model of chatModels) {
        expect(caps[model.id]).toEqual({
          tools: false,
          vision: false,
          reasoning: false,
        });
      }
    } finally {
      restore();
    }
  });

  test("returns false capabilities on non-ok response", async () => {
    const restore = mockFetch({ ok: false, json: async () => ({}) });
    try {
      const caps = await getCapabilities();
      for (const model of chatModels) {
        expect(caps[model.id]).toEqual({
          tools: false,
          vision: false,
          reasoning: false,
        });
      }
    } finally {
      restore();
    }
  });

  test("detects tools capability from supported_parameters", async () => {
    const restore = mockFetch({
      ok: true,
      json: async () => ({
        data: {
          endpoints: [{ supported_parameters: ["tools"] }],
          architecture: { input_modalities: [] },
        },
      }),
    });
    try {
      const caps = await getCapabilities();
      const firstId = chatModels[0].id;
      expect(caps[firstId].tools).toBe(true);
      expect(caps[firstId].vision).toBe(false);
      expect(caps[firstId].reasoning).toBe(false);
    } finally {
      restore();
    }
  });

  test("detects vision capability from input_modalities", async () => {
    const restore = mockFetch({
      ok: true,
      json: async () => ({
        data: {
          endpoints: [{ supported_parameters: [] }],
          architecture: { input_modalities: ["image"] },
        },
      }),
    });
    try {
      const caps = await getCapabilities();
      const firstId = chatModels[0].id;
      expect(caps[firstId].vision).toBe(true);
      expect(caps[firstId].tools).toBe(false);
    } finally {
      restore();
    }
  });
});
