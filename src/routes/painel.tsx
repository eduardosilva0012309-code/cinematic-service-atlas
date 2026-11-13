import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  createUploadUrl, deleteService, getVitrine, isUnlocked, lockPanel, saveService, saveSettings, unlockPanel,
  type Service, type Settings, type WithImage,
} from "@/lib/vitrine.functions";

export const Route = createFileRoute("/painel")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel — Rost" },
      { name: "description", content: "Painel de gerenciamento da vitrine Rost." },
      { property: "og:title", content: "Painel — Rost" },
      { property: "og:description", content: "Gerencie a vitrine Rost." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Painel,
});

function Painel() {
  const check = useServerFn(isUnlocked);
  const [state, setState] = useState<"loading" | "locked" | "open">("loading");
  useEffect(() => { check().then((r) => setState(r.ok ? "open" : "locked")); }, [check]);
  if (state === "loading") return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando…</div>;
  if (state === "locked") return <Unlock onOk={() => setState("open")} />;
  return <Editor onLock={() => setState("locked")} />;
}

function Unlock({ onOk }: { onOk: () => void }) {
  const unlock = useServerFn(unlockPanel);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form
        className="glass w-full max-w-sm rounded-2xl border p-8 shadow-gold"
        onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          const r = await unlock({ data: { password: pw } });
          setBusy(false);
          if (r.ok) onOk(); else toast.error("Senha incorreta");
        }}
      >
        <h1 className="font-display text-4xl text-gold-gradient">Painel Rost</h1>
        <p className="mt-2 text-sm text-muted-foreground">Digite a senha para gerenciar a vitrine.</p>
        <Input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} className="mt-6" placeholder="Senha" />
        <Button type="submit" disabled={busy} className="mt-4 w-full">{busy ? "Entrando…" : "Entrar"}</Button>
      </form>
    </div>
  );
}

function useUpload() {
  const getUrl = useServerFn(createUploadUrl);
  return async (file: File) => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const { path, token } = await getUrl({ data: { ext } });
    const { error } = await supabase.storage.from("media").uploadToSignedUrl(path, token, file, { contentType: file.type });
    if (error) throw error;
    return path;
  };
}

function ImageField({ src, onFile, onClear }: { src: string | null; onFile: (f: File) => Promise<void>; onClear: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-4">
      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted">
        {src && <img src={src} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="flex flex-col gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm hover:border-gold">
          {busy ? "Enviando…" : "Escolher foto do computador"}
          <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            setBusy(true);
            try { await onFile(f); toast.success("Foto enviada"); } catch { toast.error("Falha ao enviar a foto"); }
            setBusy(false); e.target.value = "";
          }} />
        </label>
        {src && <button type="button" onClick={onClear} className="text-left text-xs text-muted-foreground hover:text-destructive">Remover foto</button>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-2"><Label className="text-xs tracking-widest uppercase text-muted-foreground">{label}</Label>{children}</div>;
}

function Editor({ onLock }: { onLock: () => void }) {
  const fetchAll = useServerFn(getVitrine);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["vitrine"], queryFn: () => fetchAll() });
  const lock = useServerFn(lockPanel);
  const refresh = () => qc.invalidateQueries({ queryKey: ["vitrine"] });
  const addService = useServerFn(saveService);

  if (!data) return <div className="p-12 text-muted-foreground">Carregando…</div>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-5xl text-gold-gradient">Painel Rost</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/" target="_blank">Ver vitrine</Link></Button>
          <Button variant="ghost" onClick={async () => { await lock(); onLock(); }}>Sair</Button>
        </div>
      </div>

      <SettingsForm key={JSON.stringify(data.settings)} s={data.settings} onSaved={refresh} />

      <div className="mt-16 mb-6 flex items-center justify-between">
        <h2 className="font-display text-3xl">Serviços</h2>
        <Button onClick={async () => {
          await addService({ data: { title: "Novo serviço", sort_order: (data.services.at(-1)?.sort_order ?? 0) + 1 } });
          refresh(); toast.success("Serviço criado");
        }}>+ Adicionar serviço</Button>
      </div>
      <div className="flex flex-col gap-6">
        {data.services.map((sv) => <ServiceForm key={sv.id + sv.image_url} sv={sv} onSaved={refresh} />)}
      </div>
    </div>
  );
}

function SettingsForm({ s, onSaved }: { s: WithImage<Settings>; onSaved: () => void }) {
  const save = useServerFn(saveSettings);
  const upload = useUpload();
  const [f, setF] = useState(s);
  const set = (k: keyof Settings) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <section className="glass flex flex-col gap-5 rounded-2xl border p-6">
      <h2 className="font-display text-3xl">Abertura e botões principais</h2>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nome da marca"><Input value={f.brand} onChange={set("brand")} /></Field>
        <Field label="Frase pequena acima do título"><Input value={f.hero_kicker} onChange={set("hero_kicker")} /></Field>
      </div>
      <Field label="Título principal"><Input value={f.hero_title} onChange={set("hero_title")} /></Field>
      <Field label="Subtítulo"><Textarea value={f.hero_subtitle} onChange={set("hero_subtitle")} /></Field>
      <Field label="Foto de fundo da abertura (opcional)">
        <ImageField src={f.image_src} onFile={async (file) => {
          const path = await upload(file);
          await save({ data: { hero_image_url: path } }); onSaved();
        }} onClear={async () => { await save({ data: { hero_image_url: null } }); onSaved(); }} />
      </Field>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Texto do botão principal"><Input value={f.cta_label} onChange={set("cta_label")} /></Field>
        <Field label="Link do botão principal"><Input value={f.cta_link} onChange={set("cta_link")} placeholder="https://wa.me/55..." /></Field>
        <Field label="Link do Instagram"><Input value={f.instagram_link} onChange={set("instagram_link")} /></Field>
        <Field label="Rodapé"><Input value={f.footer_text} onChange={set("footer_text")} /></Field>
      </div>
      <Button className="self-end" onClick={async () => {
        const { image_src: _i, hero_image_url: _h, ...rest } = f;
        await save({ data: rest }); onSaved(); toast.success("Salvo");
      }}>Salvar</Button>
    </section>
  );
}

function ServiceForm({ sv, onSaved }: { sv: WithImage<Service>; onSaved: () => void }) {
  const save = useServerFn(saveService);
  const del = useServerFn(deleteService);
  const upload = useUpload();
  const [f, setF] = useState(sv);
  const set = (k: keyof Service) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: k === "sort_order" ? Number(e.target.value) : e.target.value });
  return (
    <section className="glass flex flex-col gap-5 rounded-2xl border p-6">
      <ImageField src={f.image_src} onFile={async (file) => {
        const path = await upload(file);
        await save({ data: { id: sv.id, image_url: path } }); onSaved();
      }} onClear={async () => { await save({ data: { id: sv.id, image_url: null } }); onSaved(); }} />
      <div className="grid gap-5 md:grid-cols-[1fr_1fr_100px]">
        <Field label="Nome do serviço"><Input value={f.title} onChange={set("title")} /></Field>
        <Field label="Frase curta"><Input value={f.tagline} onChange={set("tagline")} /></Field>
        <Field label="Ordem"><Input type="number" value={f.sort_order} onChange={set("sort_order")} /></Field>
      </div>
      <Field label="Descrição"><Textarea value={f.description} onChange={set("description")} /></Field>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Texto do botão"><Input value={f.button_label} onChange={set("button_label")} /></Field>
        <Field label="Link do botão"><Input value={f.button_link} onChange={set("button_link")} placeholder="https://..." /></Field>
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" className="text-destructive" onClick={async () => {
          if (!confirm("Excluir este serviço?")) return;
          await del({ data: { id: sv.id } }); onSaved(); toast.success("Excluído");
        }}>Excluir</Button>
        <Button onClick={async () => {
          const { image_src: _i, image_url: _u, ...rest } = f;
          await save({ data: rest }); onSaved(); toast.success("Salvo");
        }}>Salvar</Button>
      </div>
    </section>
  );
}
