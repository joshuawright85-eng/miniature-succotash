import { expect, test } from "@playwright/test";

const CHAT_URL_REGEX = /\/chat\/[\w-]+/;

test.describe("Message Vote Buttons", () => {
  test("upvote and downvote buttons appear on an assistant message", async ({
    page,
  }) => {
    await page.goto("/");

    // send a message and wait for an assistant reply
    await page.getByTestId("multimodal-input").fill("Hello");
    await page.getByTestId("send-button").click();

    const assistantMessage = page
      .locator("[data-testid='message-assistant']")
      .first();
    await expect(assistantMessage).toBeVisible({ timeout: 30_000 });

    // hover to reveal action buttons
    await assistantMessage.hover();

    await expect(page.getByTestId("message-upvote").first()).toBeVisible();
    await expect(page.getByTestId("message-downvote").first()).toBeVisible();
  });

  test("clicking upvote marks the message as upvoted", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("multimodal-input").fill("Hello");
    await page.getByTestId("send-button").click();

    const assistantMessage = page
      .locator("[data-testid='message-assistant']")
      .first();
    await expect(assistantMessage).toBeVisible({ timeout: 30_000 });

    await assistantMessage.hover();

    const upvoteButton = page.getByTestId("message-upvote").first();
    await expect(upvoteButton).toBeVisible();
    await upvoteButton.click();

    // after clicking, the upvote button should reflect the voted state
    // (aria-pressed="true" or a class/attribute change)
    await expect(upvoteButton).toHaveAttribute("aria-pressed", "true", {
      timeout: 5_000,
    });
  });

  test("clicking downvote marks the message as downvoted", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("multimodal-input").fill("Hello");
    await page.getByTestId("send-button").click();

    const assistantMessage = page
      .locator("[data-testid='message-assistant']")
      .first();
    await expect(assistantMessage).toBeVisible({ timeout: 30_000 });

    await assistantMessage.hover();

    const downvoteButton = page.getByTestId("message-downvote").first();
    await expect(downvoteButton).toBeVisible();
    await downvoteButton.click();

    await expect(downvoteButton).toHaveAttribute("aria-pressed", "true", {
      timeout: 5_000,
    });
  });
});

test.describe("Message Edit Button", () => {
  test("edit button appears on a user message", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("multimodal-input").fill("A message to edit");
    await page.getByTestId("send-button").click();

    // wait for URL change (message sent)
    await expect(page).toHaveURL(CHAT_URL_REGEX, { timeout: 10_000 });

    const userMessage = page
      .locator("[data-testid='message-user']")
      .first();
    await userMessage.hover();

    await expect(
      page.getByTestId("message-edit-button").first()
    ).toBeVisible();
  });
});

test.describe("Message Content", () => {
  test("assistant message content is visible after response", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("multimodal-input").fill("Say hello");
    await page.getByTestId("send-button").click();

    const assistantMessage = page
      .locator("[data-testid='message-assistant']")
      .first();
    await expect(assistantMessage).toBeVisible({ timeout: 30_000 });

    const content = await assistantMessage.textContent();
    expect(content?.trim().length).toBeGreaterThan(0);
  });

  test("user message appears in the chat after sending", async ({ page }) => {
    const messageText = "Unique message 12345";
    await page.goto("/");

    await page.getByTestId("multimodal-input").fill(messageText);
    await page.getByTestId("send-button").click();

    const userMessage = page
      .locator("[data-testid='message-user']")
      .first();
    await expect(userMessage).toBeVisible({ timeout: 10_000 });
    await expect(userMessage).toContainText(messageText);
  });
});
