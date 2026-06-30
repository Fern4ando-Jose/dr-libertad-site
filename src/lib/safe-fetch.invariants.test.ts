import { describe, it, expect } from "vitest";
import { isAllowedFetchUrl } from "./safe-fetch";

describe("anti-SSRF — isAllowedFetchUrl", () => {
  it("permite os hosts reais de imagem (HTTPS)", () => {
    expect(isAllowedFetchUrl("https://v3b.fal.media/files/x/y_speech.mp3")).toBe(true);
    expect(isAllowedFetchUrl("https://abc.public.blob.vercel-storage.com/illustrations/x.png")).toBe(true);
    expect(isAllowedFetchUrl("https://images.pexels.com/videos/1/x.mp4")).toBe(true);
    expect(isAllowedFetchUrl("https://www.drlibertad.com/images/capa.png")).toBe(true);
    expect(isAllowedFetchUrl("https://dr-libertad-site.vercel.app/images/capa.png")).toBe(true);
  });

  it("BARRA IP literal (metadata/rede interna)", () => {
    expect(isAllowedFetchUrl("http://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isAllowedFetchUrl("https://169.254.169.254/")).toBe(false);
    expect(isAllowedFetchUrl("https://10.0.0.5:8080/")).toBe(false);
    expect(isAllowedFetchUrl("https://127.0.0.1/")).toBe(false);
  });

  it("BARRA host desconhecido e não-HTTPS", () => {
    expect(isAllowedFetchUrl("https://evil.com/x.png")).toBe(false);
    expect(isAllowedFetchUrl("http://www.drlibertad.com/x.png")).toBe(false); // http
    expect(isAllowedFetchUrl("https://pexels.com.evil.com/x")).toBe(false);   // sufixo forjado
    expect(isAllowedFetchUrl("file:///etc/passwd")).toBe(false);
    expect(isAllowedFetchUrl("not a url")).toBe(false);
  });
});
