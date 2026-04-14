import { expect, test } from "@playwright/test";
import {
  ChatbotError,
  getMessageByErrorCode,
  visibilityBySurface,
} from "../../lib/errors";

test.describe("ChatbotError constructor", () => {
  test("parses type and surface from error code", () => {
    const err = new ChatbotError("bad_request:api");
    expect(err.type).toBe("bad_request");
    expect(err.surface).toBe("api");
  });

  test("is an instance of Error", () => {
    expect(new ChatbotError("bad_request:api")).toBeInstanceOf(Error);
  });

  test("stores optional cause", () => {
    const err = new ChatbotError("bad_request:api", "some cause");
    expect(err.cause).toBe("some cause");
  });

  test("leaves cause undefined when not provided", () => {
    const err = new ChatbotError("bad_request:api");
    expect(err.cause).toBeUndefined();
  });

  test("sets message from error code", () => {
    const err = new ChatbotError("bad_request:api");
    expect(err.message).toBeTruthy();
    expect(typeof err.message).toBe("string");
  });

  test.describe("statusCode mapping", () => {
    test("bad_request → 400", () => {
      expect(new ChatbotError("bad_request:api").statusCode).toBe(400);
    });

    test("unauthorized → 401", () => {
      expect(new ChatbotError("unauthorized:auth").statusCode).toBe(401);
    });

    test("forbidden → 403", () => {
      expect(new ChatbotError("forbidden:auth").statusCode).toBe(403);
    });

    test("not_found → 404", () => {
      expect(new ChatbotError("not_found:chat").statusCode).toBe(404);
    });

    test("rate_limit → 429", () => {
      expect(new ChatbotError("rate_limit:chat").statusCode).toBe(429);
    });

    test("offline → 503", () => {
      expect(new ChatbotError("offline:chat").statusCode).toBe(503);
    });
  });
});

test.describe("ChatbotError.toResponse()", () => {
  test("returns a Response object", () => {
    const err = new ChatbotError("bad_request:api");
    expect(err.toResponse()).toBeInstanceOf(Response);
  });

  test("uses the correct HTTP status code", async () => {
    const err = new ChatbotError("unauthorized:auth");
    const res = err.toResponse();
    expect(res.status).toBe(401);
  });

  test("includes error code and message in body for response visibility", async () => {
    const err = new ChatbotError("bad_request:api");
    const res = err.toResponse();
    const body = await res.json();
    expect(body.code).toBe("bad_request:api");
    expect(typeof body.message).toBe("string");
  });

  test("returns generic message and empty code for log visibility (database surface)", async () => {
    const err = new ChatbotError("bad_request:database");
    const res = err.toResponse();
    const body = await res.json();
    expect(body.code).toBe("");
    expect(body.message).toBe("Something went wrong. Please try again later.");
  });

  test("includes cause in body when provided", async () => {
    const err = new ChatbotError("forbidden:document", "not your doc");
    const res = err.toResponse();
    const body = await res.json();
    expect(body.cause).toBe("not your doc");
  });

  test("status code matches the error type in response", async () => {
    const err = new ChatbotError("not_found:chat");
    const res = err.toResponse();
    expect(res.status).toBe(404);
  });
});

test.describe("getMessageByErrorCode()", () => {
  test("returns database error message for any database surface", () => {
    expect(getMessageByErrorCode("bad_request:database")).toBe(
      "An error occurred while executing a database query."
    );
    expect(getMessageByErrorCode("not_found:database")).toBe(
      "An error occurred while executing a database query."
    );
  });

  test("bad_request:api returns correct message", () => {
    const msg = getMessageByErrorCode("bad_request:api");
    expect(msg).toContain("couldn't be processed");
  });

  test("bad_request:activate_gateway returns correct message", () => {
    const msg = getMessageByErrorCode("bad_request:activate_gateway");
    expect(msg).toContain("AI Gateway");
    expect(msg).toContain("credit card");
  });

  test("unauthorized:auth returns correct message", () => {
    const msg = getMessageByErrorCode("unauthorized:auth");
    expect(msg).toContain("sign in");
  });

  test("forbidden:auth returns correct message", () => {
    const msg = getMessageByErrorCode("forbidden:auth");
    expect(msg).toContain("access");
  });

  test("rate_limit:chat returns correct message", () => {
    const msg = getMessageByErrorCode("rate_limit:chat");
    expect(msg).toContain("message limit");
  });

  test("not_found:chat returns correct message", () => {
    const msg = getMessageByErrorCode("not_found:chat");
    expect(msg).toContain("not found");
  });

  test("forbidden:chat returns correct message", () => {
    const msg = getMessageByErrorCode("forbidden:chat");
    expect(msg).toContain("another user");
  });

  test("unauthorized:chat returns correct message", () => {
    const msg = getMessageByErrorCode("unauthorized:chat");
    expect(msg).toContain("sign in");
  });

  test("offline:chat returns correct message", () => {
    const msg = getMessageByErrorCode("offline:chat");
    expect(msg).toContain("internet connection");
  });

  test("not_found:document returns correct message", () => {
    const msg = getMessageByErrorCode("not_found:document");
    expect(msg).toContain("not found");
  });

  test("forbidden:document returns correct message", () => {
    const msg = getMessageByErrorCode("forbidden:document");
    expect(msg).toContain("another user");
  });

  test("unauthorized:document returns correct message", () => {
    const msg = getMessageByErrorCode("unauthorized:document");
    expect(msg).toContain("sign in");
  });

  test("bad_request:document returns correct message", () => {
    const msg = getMessageByErrorCode("bad_request:document");
    expect(msg).toContain("invalid");
  });

  test("returns fallback message for unmapped error codes", () => {
    // biome-ignore lint/suspicious/noExplicitAny: intentionally testing unmapped code
    const msg = getMessageByErrorCode("bad_request:history" as any);
    expect(msg).toBe("Something went wrong. Please try again later.");
  });
});

test.describe("visibilityBySurface", () => {
  test("database surface has log visibility", () => {
    expect(visibilityBySurface.database).toBe("log");
  });

  test("chat surface has response visibility", () => {
    expect(visibilityBySurface.chat).toBe("response");
  });

  test("auth surface has response visibility", () => {
    expect(visibilityBySurface.auth).toBe("response");
  });

  test("stream surface has response visibility", () => {
    expect(visibilityBySurface.stream).toBe("response");
  });

  test("api surface has response visibility", () => {
    expect(visibilityBySurface.api).toBe("response");
  });

  test("history surface has response visibility", () => {
    expect(visibilityBySurface.history).toBe("response");
  });

  test("vote surface has response visibility", () => {
    expect(visibilityBySurface.vote).toBe("response");
  });

  test("document surface has response visibility", () => {
    expect(visibilityBySurface.document).toBe("response");
  });

  test("suggestions surface has response visibility", () => {
    expect(visibilityBySurface.suggestions).toBe("response");
  });

  test("activate_gateway surface has response visibility", () => {
    expect(visibilityBySurface.activate_gateway).toBe("response");
  });
});
