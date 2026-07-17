// ─── Biblioteca CURADA de footage por pilar (DR Liberdade) ────────────────────
// 2026-07-14: acervo vetado à mão pela análise visual dos pôsteres — retrato 9:16,
// sem texto/inglês na tela, sem macro de pele/NSFW, SEM crianças/adolescentes,
// on-message por símbolo do pilar (mesmo crivo da UPM). Substitui a ROLETA da busca
// Pexels ao vivo (fonte única que secava e repetia). O Reel sorteia SÓ deste
// whitelist, determinístico por (tópico,dia), sem repetir clipe no mesmo reel.
//
// 2026-07-16: MIX de 4 fontes — Pexels vídeo (abaixo, ~9-12/pilar, curado à mão) +
// Pexels FOTO (Ken Burns) + Pixabay vídeo/foto (fail-open até PIXABAY_API_KEY
// existir) — todas vetadas pelo MESMO juiz automático de visão (footage-qa.ts,
// Haiku barato no poster) em vez de olho humano por item. `mediaType`/`source` são
// só METADADOS (documentação/relatório do QA em massa) — o RENDER detecta foto ×
// vídeo pela extensão da própria URL (isPhotoUrl, src/lib/footage-media.ts), não
// por este campo, então entradas antigas sem `mediaType` continuam funcionando
// sem qualquer migração. `why`/`alt` = legenda curta (poster do QA + contexto
// humano). scripts/vet-footage-library.mjs é quem AMPLIA esta lista (ver README lá).
// Categorias do DR: freedom · dopamine · anxiety · network · self · mind.
//
// 2026-07-17: campo `who` — QUEM aparece no clipe. Regra de curadoria: **o sujeito da
// imagem tem que ser o sujeito da frase**. Sem ele, um tema explicitamente sobre HOMENS
// ("La conversación entre hombres…", ed. 164) sorteava um dos 3 clipes de MULHER do pilar
// `self` → copy de homem, imagem de mulher. `who` é OPCIONAL e o filtro é FAIL-OPEN:
// clipe sem `who` (ou tema sem `who`) entra em tudo, exatamente como antes. Classificação
// derivada do `why` de cada entrada, conservadora: gênero não explícito → "none".
// "none" = silhueta/pessoa não identificável por gênero, objeto ou multidão anônima —
// serve para QUALQUER tema. Regra de casamento: src/lib/footage-subject.ts.
export type FootageClip = {
  url: string;
  poster?: string;
  why?: string;
  who?: "man" | "woman" | "couple" | "group" | "none"; // quem aparece — casa com o sujeito do tema (footage-subject.ts)
  mediaType?: "video" | "photo"; // metadado (relatório) — render decide pela URL, não por este campo
  source?: "pexels" | "pixabay";
};

export const FOOTAGE_LIBRARY: Record<string, FootageClip[]> = {
  // LIBERDADE — a saída (respirar, natureza, estrada aberta, largar o telefone) — 12 clipes
  freedom: [
    { url: "https://videos.pexels.com/video-files/29300487/12635838_1080_1920_60fps.mp4", poster: "https://images.pexels.com/videos/29300487/pexels-photo-29300487.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "silhueta no penhasco contemplando o vale ao entardecer", who: "none" },
    { url: "https://videos.pexels.com/video-files/29062780/12562339_1080_1920_60fps.mp4", poster: "https://images.pexels.com/videos/29062780/yoga-29062780.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "silhueta de braços abertos ao pôr do sol sobre as rochas", who: "none" },
    { url: "https://videos.pexels.com/video-files/9199775/9199775-hd_1080_1920_30fps.mp4", poster: "https://images.pexels.com/videos/9199775/pexels-photo-9199775.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "pessoa em cadeira de rodas ergue os braços ao sol — libertação", who: "none" },
    { url: "https://videos.pexels.com/video-files/32167375/13716837_1080_1920_30fps.mp4", poster: "https://images.pexels.com/videos/32167375/freedom-herbs-nature-outdoorsy-32167375.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "corredor cruzando o campo dourado na hora dourada", who: "none" },
    { url: "https://videos.pexels.com/video-files/3052594/3052594-hd_1080_1920_24fps.mp4", poster: "https://images.pexels.com/videos/3052594/free-video-3052594.jpg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "homem caminhando na estrada aberta e vazia", who: "man" },
    { url: "https://videos.pexels.com/video-files/29939637/12849291_1080_1920_30fps.mp4", poster: "https://images.pexels.com/videos/29939637/on-the-road-walk-29939637.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mochileiro subindo a trilha com o vale ao fundo", who: "none" },
    { url: "https://videos.pexels.com/video-files/11760019/11760019-hd_1080_2048_30fps.mp4", poster: "https://images.pexels.com/videos/11760019/pexels-photo-11760019.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mulher puxando a mala pela estrada de terra vermelha", who: "woman" },
    { url: "https://videos.pexels.com/video-files/38395554/16303646_1080_1920_120fps.mp4", poster: "https://images.pexels.com/videos/38395554/pexels-photo-38395554.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "grupo caminhando junto pela alameda arborizada", who: "group" },
    { url: "https://videos.pexels.com/video-files/8865622/8865622-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/8865622/pexels-photo-8865622.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "dois caminhantes na estrada em meio ao deserto", who: "group" },
    { url: "https://videos.pexels.com/video-files/34695748/14705547_1080_1920_60fps.mp4", poster: "https://images.pexels.com/videos/34695748/camera-canyon-cars-cliffs-34695748.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "ciclista minúsculo sob o paredão do cânion — imensidão", who: "none" },
    { url: "https://videos.pexels.com/video-files/8045821/8045821-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/8045821/pexels-photo-8045821.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mulher caminhando pela estrada rumo ao sol", who: "woman" },
    { url: "https://videos.pexels.com/video-files/15461512/15461512-hd_1080_1920_30fps.mp4", poster: "https://images.pexels.com/videos/15461512/alone-bright-daylight-dirt-15461512.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "homem caminhando pela trilha de terra ao entardecer", who: "man" },
  ],
  // DOPAMINA — o loop que vicia (rolar o feed na cama, tela na madrugada) — 9 clipes
  dopamine: [
    { url: "https://videos.pexels.com/video-files/7131726/7131726-hd_1080_2048_30fps.mp4", poster: "https://images.pexels.com/videos/7131726/pexels-photo-7131726.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "homem sentado na cama preso ao celular à noite", who: "man" },
    { url: "https://videos.pexels.com/video-files/7351362/7351362-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/7351362/pexels-photo-7351362.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "casal na cama, cada um no próprio celular sob luz neon", who: "couple" },
    { url: "https://videos.pexels.com/video-files/6598885/6598885-hd_1080_1920_30fps.mp4", poster: "https://images.pexels.com/videos/6598885/addiction-alone-anxiety-bed-6598885.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mulher rolando o feed à luz de vela na madrugada", who: "woman" },
    { url: "https://videos.pexels.com/video-files/6446175/6446175-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/6446175/pexels-photo-6446175.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "de cima: pessoa deitada com máscara de dormir, ainda no celular", who: "none" },
    { url: "https://videos.pexels.com/video-files/6421435/6421435-hd_1080_1918_30fps.mp4", poster: "https://images.pexels.com/videos/6421435/pexels-photo-6421435.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "pessoa deitada fisgada pela tela ao amanhecer", who: "none" },
    { url: "https://videos.pexels.com/video-files/13801233/13801233-hd_1080_1920_24fps.mp4", poster: "https://images.pexels.com/videos/13801233/access-adult-blur-business-13801233.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "homem de terno rolando o feed andando na rua", who: "man" },
    { url: "https://videos.pexels.com/video-files/17808481/17808481-hd_1080_1920_40fps.mp4", poster: "https://images.pexels.com/videos/17808481/pexels-photo-17808481.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "homem parado no corredor absorto no celular", who: "man" },
    { url: "https://videos.pexels.com/video-files/8060394/8060394-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/8060394/pexels-photo-8060394.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "celular no carregador em foco, pessoas desfocadas atrás", who: "none" },
    { url: "https://videos.pexels.com/video-files/6380637/6380637-hd_1080_1920_24fps.mp4", poster: "https://images.pexels.com/videos/6380637/pexels-photo-6380637.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mulher de moletom sorrindo pra tela — o prazer do feed", who: "woman" },
  ],
  // ANSIEDADE — o preço na mente (tensão, sobrecarga, tela à noite) — 12 clipes
  anxiety: [
    { url: "https://videos.pexels.com/video-files/7279746/7279746-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/7279746/pexels-photo-7279746.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mulher no escuro, encolhida, olhando o celular — melancolia", who: "woman" },
    { url: "https://videos.pexels.com/video-files/7277930/7277930-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/7277930/pexels-photo-7277930.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "rosto tenso sob a luz vermelha da tela", who: "none" },
    { url: "https://videos.pexels.com/video-files/6913257/6913257-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/6913257/pexels-photo-6913257.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "jovem afundado na mesa, papel amassado — sobrecarga", who: "none" },
    { url: "https://videos.pexels.com/video-files/7698695/7698695-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/7698695/pexels-photo-7698695.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "homem na beira da cama, cabeça baixa no celular — desânimo", who: "man" },
    { url: "https://videos.pexels.com/video-files/6754003/6754003-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/6754003/pexels-photo-6754003.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "figura encolhida sob o cobertor no quarto azul — angústia", who: "none" },
    { url: "https://videos.pexels.com/video-files/7942762/7942762-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/7942762/pexels-photo-7942762.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "homem tenso diante do laptop na luz azul da madrugada", who: "man" },
    { url: "https://videos.pexels.com/video-files/6031853/6031853-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/6031853/burnout-depression-woman-6031853.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mulher abraçando os joelhos no sofá com o celular — aflição", who: "woman" },
    { url: "https://videos.pexels.com/video-files/7985891/7985891-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/7985891/pexels-photo-7985891.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "perfil sério e tenso na penumbra", who: "none" },
    { url: "https://videos.pexels.com/video-files/8458643/8458643-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/8458643/pexels-photo-8458643.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "homem deitado inquieto olhando o celular à noite", who: "man" },
    { url: "https://videos.pexels.com/video-files/8458634/8458634-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/8458634/pexels-photo-8458634.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "homem com as mãos no rosto — angústia", who: "man" },
    { url: "https://videos.pexels.com/video-files/29460959/12681703_1080_1920_24fps.mp4", poster: "https://images.pexels.com/videos/29460959/pexels-photo-29460959.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "homem afundado na mesa, mão na cabeça — desespero", who: "man" },
    { url: "https://videos.pexels.com/video-files/6382079/6382079-hd_1080_1920_24fps.mp4", poster: "https://images.pexels.com/videos/6382079/pexels-photo-6382079.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mulher com as mãos na cabeça — sobrecarga", who: "woman" },
  ],
  // CONEXÃO PERDIDA — juntos e sozinhos (casal/pessoas distraídos pela tela) — 12 clipes
  network: [
    { url: "https://videos.pexels.com/video-files/8555714/8555714-hd_1080_1920_24fps.mp4", poster: "https://images.pexels.com/videos/8555714/pexels-photo-8555714.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "casal afastado no sofá, braços cruzados — distância", who: "couple" },
    { url: "https://videos.pexels.com/video-files/7696096/7696096-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/7696096/achievement-adolescent-affection-aid-7696096.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "casal deitado, cada um no seu celular — juntos e sozinhos", who: "couple" },
    { url: "https://videos.pexels.com/video-files/7351359/7351359-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/7351359/pexels-photo-7351359.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "casal abraçado no sofá, cada um no seu celular no escuro", who: "couple" },
    { url: "https://videos.pexels.com/video-files/9785297/9785297-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/9785297/pexels-photo-9785297.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "casal de costas um pro outro, cada um no celular", who: "couple" },
    { url: "https://videos.pexels.com/video-files/15796760/15796760-hd_1080_1920_24fps.mp4", poster: "https://images.pexels.com/videos/15796760/architecture-atardecer-city-city-street-15796760.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "silhuetas de multidão ao anoitecer — só no meio de muitos", who: "group" },
    { url: "https://videos.pexels.com/video-files/35736045/15146717_1080_1920_60fps.mp4", poster: "https://images.pexels.com/videos/35736045/pexels-photo-35736045.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "pessoa carregando sacolas sozinha em meio à multidão", who: "none" },
    { url: "https://videos.pexels.com/video-files/8458669/8458669-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/8458669/pexels-photo-8458669.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "homem encolhido e sozinho numa sala vazia — isolamento", who: "man" },
    { url: "https://videos.pexels.com/video-files/37215129/15765177_1080_1920_60fps.mp4", poster: "https://images.pexels.com/videos/37215129/pexels-photo-37215129.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "multidão vista de cima na escadaria — anonimato", who: "group" },
    { url: "https://videos.pexels.com/video-files/34762047/14737028_1080_1920_60fps.mp4", poster: "https://images.pexels.com/videos/34762047/bustling-streets-city-life-city-tour-cityscape-34762047.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "aglomeração de gente à noite — só no meio de muitos", who: "group" },
    { url: "https://videos.pexels.com/video-files/7986631/7986631-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/7986631/at-home-couple-gadgets-life-at-home-7986631.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "casal afastado no sofá, cada um no celular à luz da janela", who: "couple" },
    { url: "https://videos.pexels.com/video-files/7279468/7279468-hd_1080_2048_24fps.mp4", poster: "https://images.pexels.com/videos/7279468/adult-analytics-beautiful-women-black-and-white-7279468.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "casal de costas no sofá, cada um no seu celular", who: "couple" },
    { url: "https://videos.pexels.com/video-files/7477606/7477606-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/7477606/pexels-photo-7477606.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "casal maduro à mesa, um no celular, o outro no café", who: "couple" },
  ],
  // O EU — introspecção (reflexão à janela, pensar em silêncio) — 12 clipes
  self: [
    { url: "https://videos.pexels.com/video-files/6382073/6382073-hd_1080_1920_24fps.mp4", poster: "https://images.pexels.com/videos/6382073/pexels-photo-6382073.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mulher pensativa à janela, mão no queixo", who: "woman" },
    { url: "https://videos.pexels.com/video-files/34787944/14749613_1080_1920_30fps.mp4", poster: "https://images.pexels.com/videos/34787944/book-reading-by-the-window-with-metropolitan-view-34787944.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "silhueta lendo à janela com a cidade ao fundo", who: "none" },
    { url: "https://videos.pexels.com/video-files/6563972/6563972-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/6563972/account-analysis-beautiful-board-6563972.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mulher com café olhando pra baixo, introspecção à janela", who: "woman" },
    { url: "https://videos.pexels.com/video-files/4774968/4774968-hd_1080_1920_30fps.mp4", poster: "https://images.pexels.com/videos/4774968/african-american-afro-afroamerican-bath-4774968.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "perfil de homem diante das luzes da cidade — reflexão", who: "man" },
    { url: "https://videos.pexels.com/video-files/7224498/7224498-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/7224498/pexels-photo-7224498.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "pessoa de pé olhando pela janela ampla — solidão serena", who: "woman" },
    { url: "https://videos.pexels.com/video-files/6965770/6965770-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/6965770/pexels-photo-6965770.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mulher sentada à janela alta, pensativa", who: "woman" },
    { url: "https://videos.pexels.com/video-files/7670135/7670135-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/7670135/adult-backlit-beach-bedroom-7670135.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "silhueta na varanda com o celular ao anoitecer", who: "none" },
    { url: "https://videos.pexels.com/video-files/8862321/8862321-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/8862321/pexels-photo-8862321.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "silhueta de perfil junto à cortina — introspecção", who: "none" },
    { url: "https://videos.pexels.com/video-files/8862323/8862323-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/8862323/pexels-photo-8862323.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "perfil de pessoa idosa em silêncio — reflexão", who: "none" },
    { url: "https://videos.pexels.com/video-files/8496759/8496759-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/8496759/adult-bald-black-model-boy-8496759.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "retrato contemplativo de homem na penumbra", who: "man" },
    { url: "https://videos.pexels.com/video-files/6944080/6944080-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/6944080/bed-bedroom-boredom-diverse-6944080.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "homem de mãos juntas, pensativo sob luz quente", who: "man" },
    { url: "https://videos.pexels.com/video-files/30728865/13145942_1080_1920_30fps.mp4", poster: "https://images.pexels.com/videos/30728865/4k-video-anonymous-person-artistic-shadow-backlight-30728865.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "silhueta com a mão na cabeça no facho de luz — reflexão", who: "none" },
  ],
  // A MENTE CALMA — o despertar (meditação, respiração, presença) — 12 clipes
  mind: [
    { url: "https://videos.pexels.com/video-files/8347524/8347524-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/8347524/pexels-photo-8347524.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mulher meditando de olhos fechados ao lado da planta", who: "woman" },
    { url: "https://videos.pexels.com/video-files/7525800/7525800-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/7525800/adult-baking-candle-ceremony-7525800.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mãos segurando uma vela acesa — ritual de calma", who: "none" },
    { url: "https://videos.pexels.com/video-files/6297117/6297117-hd_1080_1920_24fps.mp4", poster: "https://images.pexels.com/videos/6297117/pexels-photo-6297117.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "homem meditando no tapete contra a parede de tijolos", who: "man" },
    { url: "https://videos.pexels.com/video-files/9034025/9034025-hd_1080_1920_24fps.mp4", poster: "https://images.pexels.com/videos/9034025/pexels-photo-9034025.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mulher de olhos fechados encostada na árvore ao ar livre", who: "woman" },
    { url: "https://videos.pexels.com/video-files/7490113/7490113-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/7490113/pexels-photo-7490113.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "homem em lótus meditando junto à lareira", who: "man" },
    { url: "https://videos.pexels.com/video-files/6930967/6930967-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/6930967/adult-business-businessman-businesswoman-6930967.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "homem sereno com o café, olhar tranquilo — presença", who: "man" },
    { url: "https://videos.pexels.com/video-files/6956162/6956162-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/6956162/buddhism-buddhist-contemplation-girl-6956162.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mulher à janela olhando o horizonte com calma", who: "woman" },
    { url: "https://videos.pexels.com/video-files/7224498/7224498-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/7224498/pexels-photo-7224498.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mulher de pé à janela ampla, respirando devagar", who: "woman" },
    { url: "https://videos.pexels.com/video-files/6941382/6941382-hd_1080_2048_25fps.mp4", poster: "https://images.pexels.com/videos/6941382/pexels-photo-6941382.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "pessoa meditando envolta na fumaça do incenso", who: "none" },
    { url: "https://videos.pexels.com/video-files/35853601/15204363_1080_1920_30fps.mp4", poster: "https://images.pexels.com/videos/35853601/pexels-photo-35853601.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "fumaça de incenso subindo em close — ritual de calma", who: "none" },
    { url: "https://videos.pexels.com/video-files/6438232/6438232-hd_1080_1920_25fps.mp4", poster: "https://images.pexels.com/videos/6438232/pexels-photo-6438232.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "mulher em lótus meditando no estúdio em penumbra", who: "woman" },
    { url: "https://videos.pexels.com/video-files/9035656/9035656-hd_1080_1920_24fps.mp4", poster: "https://images.pexels.com/videos/9035656/pexels-photo-9035656.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630", why: "rosto sereno de olhos fechados — respiração e presença", who: "none" },
  ],
};
