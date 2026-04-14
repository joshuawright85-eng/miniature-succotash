import { expect, test } from "@playwright/test";
import {
  cn,
  generateUUID,
  getDocumentTimestampByIndex,
  getTextFromMessage,
  sanitizeText,
} from "../../lib/utils";

test.describe("cn()", () => {
  test("merges class names into a single string", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  test("omits falsy conditional classes", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  test("deduplicates conflicting tailwind utility classes", () => {
    // tailwind-merge should keep only the last conflicting class
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  test("returns empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });

  test("handles undefined and null gracefully", () => {
    expect(cn(undefined, null, "a")).toBe("a");
  });

  test("merges object syntax", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
  });
});

test.describe("generateUUID()", () => {
  test("returns a string", () => {
    expect(typeof generateUUID()).toBe("string");
  });

  test("matches UUID v4 format", () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  test("generates unique values on repeated calls", () => {
    const uuids = new Set(Array.from({ length: 50 }, () => generateUUID()));
    expect(uuids.size).toBe(50);
  });
});

test.describe("sanitizeText()", () => {
  test("removes <has_function_call> marker", () => {
    expect(sanitizeText("hello<has_function_call>world")).toBe("helloworld");
  });

  test("leaves text unchanged when marker is absent", () => {
    expect(sanitizeText("hello world")).toBe("hello world");
  });

  test("handles an empty string", () => {
    expect(sanitizeText("")).toBe("");
  });

  test("removes multiple occurrences of the marker", () => {
    expect(sanitizeText("<has_function_call>a<has_function_call>")).toBe("a");
  });
});

test.describe("getDocumentTimestampByIndex()", () => {
  const t1 = new Date("2024-01-01T00:00:00Z");
  const t2 = new Date("2024-01-02T00:00:00Z");

  const docs = [
    {
      id: "doc-1",
      createdAt: t1,
      title: "First",
      kind: "text",
      content: "",
      userId: "u1",
    },
    {
      id: "doc-2",
      createdAt: t2,
      title: "Second",
      kind: "text",
      content: "",
      userId: "u1",
    },
  ];

  test("returns the correct timestamp for a valid index", () => {
    expect(getDocumentTimestampByIndex(docs, 0)).toBe(t1);
    expect(getDocumentTimestampByIndex(docs, 1)).toBe(t2);
  });

  test("returns a new Date when index exceeds document count", () => {
    const result = getDocumentTimestampByIndex(docs, 10);
    expect(result).toBeInstanceOf(Date);
  });

  test("returns a new Date when documents array is null/undefined", () => {
    // biome-ignore lint/suspicious/noExplicitAny: intentionally testing bad input
    const result = getDocumentTimestampByIndex(null as any, 0);
    expect(result).toBeInstanceOf(Date);
  });
});

test.describe("getTextFromMessage()", () => {
  test("concatenates text from all text parts", () => {
    const message = {
      id: "m1",
      role: "user" as const,
      parts: [
        { type: "text" as const, text: "Hello" },
        { type: "text" as const, text: " World" },
      ],
      metadata: { createdAt: "" },
    };
    // biome-ignore lint/suspicious/noExplicitAny: using simplified test fixture
    expect(getTextFromMessage(message as any)).toBe("Hello World");
  });

  test("ignores non-text parts", () => {
    const message = {
      id: "m1",
      role: "user" as const,
      parts: [
        { type: "text" as const, text: "Only this" },
        {
          type: "tool-invocation" as const,
          toolCallId: "tc1",
          toolName: "getWeather",
          state: "call" as const,
          input: {},
        },
      ],
      metadata: { createdAt: "" },
    };
    // biome-ignore lint/suspicious/noExplicitAny: using simplified test fixture
    expect(getTextFromMessage(message as any)).toBe("Only this");
  });

  test("returns empty string when there are no parts", () => {
    const message = {
      id: "m1",
      role: "user" as const,
      parts: [],
      metadata: { createdAt: "" },
    };
    // biome-ignore lint/suspicious/noExplicitAny: using simplified test fixture
    expect(getTextFromMessage(message as any)).toBe("");
  });

  test("returns empty string when no text parts exist", () => {
    const message = {
      id: "m1",
      role: "assistant" as const,
      parts: [
        {
          type: "tool-invocation" as const,
          toolCallId: "tc2",
          toolName: "getWeather",
          state: "call" as const,
          input: {},
        },
      ],
      metadata: { createdAt: "" },
    };
    // biome-ignore lint/suspicious/noExplicitAny: using simplified test fixture
    expect(getTextFromMessage(message as any)).toBe("");
  });
});
