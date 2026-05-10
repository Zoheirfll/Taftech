// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import api from "../src/api/axiosConfig.js";
import * as reporter from "../src/utils/errorReporter";

const mockApi = new MockAdapter(api);
const mockGlobalAxios = new MockAdapter(axios);

describe("⚙️ Système - Intercepteurs Axios & Télémétrie", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    delete window.location;
    window.location = { href: "" };
    vi.spyOn(reporter, "reportError"); // On espionne la remontée d'erreurs
    vi.spyOn(Storage.prototype, "removeItem");
  });

  afterEach(() => {
    mockApi.reset();
    mockGlobalAxios.reset();
    window.location = originalLocation;
    vi.restoreAllMocks();
  });

  it("🟢 Happy Path : Laisse passer une requête 200 OK", async () => {
    mockApi.onGet("/jobs/").reply(200, { data: "ok" });
    const response = await api.get("/jobs/");
    expect(response.status).toBe(200);
    expect(reporter.reportError).not.toHaveBeenCalled();
  });

  it("🔴 Edge Case : Erreur réseau -> Doit appeler reportError", async () => {
    mockApi.onGet("/jobs/").networkError();
    try {
      await api.get("/jobs/");
    } catch {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "PANNE_RESEAU_OU_SERVEUR_OFFLINE",
        expect.anything(),
      );
    }
  });

  it("🔴 Edge Case : Erreur 500 -> Doit appeler reportError avec l'URL", async () => {
    mockApi.onGet("/stats/").reply(500);
    try {
      await api.get("/stats/");
    } catch {
      expect(reporter.reportError).toHaveBeenCalledWith(
        expect.stringContaining("ERREUR_SERVEUR_500"),
        expect.anything(),
      );
    }
  });

  it("🟡 Edge Case : Refresh success -> Rejoue la requête", async () => {
    mockApi.onGet("/me/").replyOnce(401);
    mockGlobalAxios
      .onPost("http://localhost:8000/api/token/refresh/")
      .reply(200);
    mockApi.onGet("/me/").replyOnce(200, { name: "Alaa" });

    const response = await api.get("/me/");
    expect(response.data.name).toBe("Alaa");
    expect(response.status).toBe(200);
  });
});
