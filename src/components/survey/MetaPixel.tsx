"use client";

// ─── Meta Pixel (PLACEHOLDER controlado por env — sem env, NADA carrega) ─────
// O Pixel ainda NÃO existe (será criado no Business Manager; o ID nunca é
// inventado aqui). Quando o dono/agente criar o Pixel, basta setar
// NEXT_PUBLIC_META_PIXEL_ID na Vercel — aí este componente injeta o snippet
// oficial e dispara: PageView (toda montagem) + o evento custom recebido em
// `event` (ex.: "pesquisa_enviada" na página de obrigado). Sem a env, o
// componente devolve null e nenhum byte do Pixel entra na página.

import { useEffect } from "react";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type Fbq = ((...args: unknown[]) => void) & {
  queue?: unknown[];
  callMethod?: (...args: unknown[]) => void;
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

function ensureFbq(): Fbq | null {
  if (typeof window === "undefined") return null;
  if (window.fbq) return window.fbq;
  // Snippet oficial da Meta, transcrito sem eval.
  const fbq: Fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else (fbq.queue as unknown[]).push(args);
  };
  fbq.queue = [];
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  return fbq;
}

export default function MetaPixel({ event }: { event?: string }) {
  useEffect(() => {
    if (!PIXEL_ID) return; // placeholder: sem env → não carrega nada
    const fbq = ensureFbq();
    if (!fbq) return;
    fbq("init", PIXEL_ID);
    fbq("track", "PageView");
    if (event) fbq("trackCustom", event);
  }, [event]);

  return null;
}
