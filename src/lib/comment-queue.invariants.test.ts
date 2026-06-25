// Invariantes da esteira de comentário: o que é "post fresco" (comentar cedo é o que
// faz a mega pagar), ranqueamento por frescor×engajamento, teto de cadência + dedup,
// e o prompt do comentário outbound (curto, sem citar a marca, sem puxar saco).
import { describe, it, expect } from "vitest";
import { accountFor } from "./accounts";
import { buildVoiceDirective } from "./voice";
import {
  postAgeMinutes,
  isFreshPost,
  rankFreshPosts,
  applyCapAndDedup,
  buildCommentPrompt,
  type DiscoveredPost,
} from "./comment-queue";

const NOW = Date.parse("2026-06-24T12:00:00Z");
const post = (id: string, minsAgo: number, likes = 0, comments = 0): DiscoveredPost => ({
  id,
  permalink: `https://instagram.com/p/${id}`,
  timestamp: new Date(NOW - minsAgo * 60000).toISOString(),
  like_count: likes,
  comments_count: comments,
});

describe("frescor do post", () => {
  it("calcula idade em minutos; sem timestamp = infinito", () => {
    expect(postAgeMinutes(new Date(NOW - 30 * 60000).toISOString(), NOW)).toBeCloseTo(30, 0);
    expect(postAgeMinutes(undefined, NOW)).toBe(Infinity);
  });
  it("post recente é fresco; post velho não", () => {
    expect(isFreshPost(post("a", 30), NOW)).toBe(true);
    expect(isFreshPost(post("b", 400), NOW)).toBe(false); // > 180min afunda na mega
  });
});

describe("rankFreshPosts — frescor × engajamento", () => {
  it("descarta posts não-frescos e ordena por score (novo+quente no topo)", () => {
    const ranked = rankFreshPosts([
      { target: "walter_riso", posts: [post("velho", 500, 9999, 9999), post("novoquente", 20, 800, 200)] },
      { target: "jorgelozanoh", posts: [post("novofraco", 20, 10, 1)] },
    ], NOW);
    // o "velho" (500min) sai mesmo com engajamento alto
    expect(ranked.find((r) => r.post.id === "velho")).toBeUndefined();
    // novo+quente vem antes de novo+fraco
    expect(ranked[0].post.id).toBe("novoquente");
    expect(ranked[1].post.id).toBe("novofraco");
  });
});

describe("applyCapAndDedup — freio de cadência + sem repetir", () => {
  it("respeita o teto diário por conta", () => {
    const ranked = rankFreshPosts([{ target: "t", posts: [post("p1", 10, 5), post("p2", 20, 4), post("p3", 30, 3)] }], NOW);
    expect(applyCapAndDedup(ranked, 2, new Set())).toHaveLength(2);
  });
  it("pula posts já enfileirados (dedup por id)", () => {
    const ranked = rankFreshPosts([{ target: "t", posts: [post("p1", 10, 5), post("p2", 20, 4)] }], NOW);
    const out = applyCapAndDedup(ranked, 10, new Set(["p1"]));
    expect(out.map((o) => o.post.id)).toEqual(["p2"]);
  });
});

describe("buildCommentPrompt — comentário outbound na voz", () => {
  const v = buildVoiceDirective(accountFor("es"));
  it("carrega a voz e pede comentário curto, sem marca, sem puxa-saco", () => {
    const p = buildCommentPrompt(v, post("x", 10), "español");
    expect(p).toContain("JAMÁS del odio");        // guarda anti-ódio sempre
    expect(p).toMatch(/MÁXIMO ~150/);              // curto
    expect(p).toMatch(/NO menciones tu marca/);    // sem auto-promoção (anti-spam)
    expect(p).toMatch(/SOLO el texto/);
  });
});
