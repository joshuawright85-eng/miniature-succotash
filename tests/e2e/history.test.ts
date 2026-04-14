import { expect, test } from "@playwright/test";

const SIDEBAR_SLOT = "[data-slot='sidebar']";

async function ensureSidebarOpen(page: import("@playwright/test").Page) {
  const sidebar = page.locator(SIDEBAR_SLOT);
  if (!(await sidebar.isVisible())) {
    await page.getByTestId("sidebar-toggle-button").click();
    await expect(sidebar).toBeVisible();
  }
  return sidebar;
}

test.describe("Sidebar Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("sidebar toggle button is visible on the chat page", async ({
    page,
  }) => {
    const toggle = page.getByTestId("sidebar-toggle-button");
    await expect(toggle).toBeVisible();
  });

  test("clicking the toggle button opens or closes the sidebar", async ({
    page,
  }) => {
    const toggle = page.getByTestId("sidebar-toggle-button");
    const sidebar = page.locator(SIDEBAR_SLOT);
    const initiallyVisible = await sidebar.isVisible();

    await toggle.click();

    if (initiallyVisible) {
      await expect(sidebar).not.toBeVisible();
    } else {
      await expect(sidebar).toBeVisible();
    }
  });
});

test.describe("Chat History in Sidebar", () => {
  test("new chat button / link is accessible in the sidebar", async ({
    page,
  }) => {
    await page.goto("/");
    await ensureSidebarOpen(page);

    const newChatLink = page.getByRole("link", { name: /new\s*chat/i });
    await expect(newChatLink).toBeVisible();
  });

  test("user nav button is visible in the sidebar", async ({ page }) => {
    await page.goto("/");
    await ensureSidebarOpen(page);

    await expect(page.getByTestId("user-nav-button")).toBeVisible();
  });
});

test.describe("User Navigation Menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await ensureSidebarOpen(page);
  });

  test("user nav menu opens on click", async ({ page }) => {
    await page.getByTestId("user-nav-button").click();
    await expect(page.getByTestId("user-nav-menu")).toBeVisible();
  });

  test("user nav menu contains theme toggle", async ({ page }) => {
    await page.getByTestId("user-nav-button").click();
    await expect(page.getByTestId("user-nav-item-theme")).toBeVisible();
  });

  test("user nav menu contains auth item", async ({ page }) => {
    await page.getByTestId("user-nav-button").click();
    await expect(page.getByTestId("user-nav-item-auth")).toBeVisible();
  });
});
