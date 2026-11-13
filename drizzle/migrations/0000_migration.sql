create table public.site_settings (
  id int primary key default 1 check (id = 1),
  brand text not null default 'Rost',
  hero_kicker text not null default 'Agência criativa',
  hero_title text not null default 'Criamos marcas impossíveis de ignorar',
  hero_subtitle text not null default 'Estratégia, design e tecnologia em uma experiência cinematográfica.',
  hero_image_url text,
  cta_label text not null default 'Fale com a Rost',
  cta_link text not null default 'https://wa.me/',
  instagram_link text not null default 'https://instagram.com/',
  footer_text text not null default '© Rost. Todos os direitos reservados.',
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon, authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "public read settings" on public.site_settings for select to anon, authenticated using (true);
insert into public.site_settings (id) values (1);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Novo serviço',
  tagline text not null default '',
  description text not null default '',
  image_url text,
  button_label text not null default 'Quero este',
  button_link text not null default 'https://wa.me/',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.services to anon, authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "public read services" on public.services for select to anon, authenticated using (true);
insert into public.services (title, tagline, description, button_label, sort_order) values
('Branding', 'Identidade que marca', 'Logotipo, paleta, tipografia e um universo visual completo para sua marca brilhar.', 'Quero minha marca', 1),
('Sites & Landing Pages', 'Experiências que convertem', 'Sites rápidos, bonitos e pensados para transformar visitas em clientes.', 'Quero meu site', 2),
('Tráfego Pago', 'Anúncios que vendem', 'Campanhas no Meta e Google com estratégia, criativos e otimização contínua.', 'Quero vender mais', 3),
('Social Media', 'Presença que encanta', 'Planejamento, conteúdo e gestão das suas redes com estética premium.', 'Quero crescer', 4),
('Produção Audiovisual', 'Filmes que emocionam', 'Vídeos, reels e fotos com linguagem de cinema para sua marca.', 'Quero gravar', 5);