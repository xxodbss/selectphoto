-- 앨범과 사진 표, 모델용 창구 함수

-- 앨범: 작가가 만들고, share_token이 공유 링크 주소가 된다
create table public.albums (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  -- 추측하기 어려운 32자리 코드 (링크 주소에 들어감)
  share_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  five_star_limit int not null default 10 check (five_star_limit > 0),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

-- 사진: 별점은 사진마다 한 칸 (0 = 안 매김/마음에 안 듦)
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums (id) on delete cascade,
  filename text not null,
  storage_path text not null,
  sort_order int not null,
  rating smallint not null default 0 check (rating between 0 and 5),
  created_at timestamptz not null default now()
);

create index photos_album_order_idx on public.photos (album_id, sort_order);

-- 표 직접 접근은 로그인한 작가가 자기 앨범에만 할 수 있다
alter table public.albums enable row level security;
alter table public.photos enable row level security;

create policy "작가는 자기 앨범만" on public.albums
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "작가는 자기 앨범의 사진만" on public.photos
  for all to authenticated
  using (exists (
    select 1 from public.albums a
    where a.id = album_id and a.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.albums a
    where a.id = album_id and a.owner_id = (select auth.uid())
  ));

-- 모델(로그인 없음)은 아래 함수로만 앨범을 보고 별점을 저장한다

-- 공유 코드로 앨범과 사진 목록 가져오기 (없는 코드면 null)
create function public.get_album(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'title', a.title,
    'five_star_limit', a.five_star_limit,
    'submitted_at', a.submitted_at,
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'filename', p.filename,
        'storage_path', p.storage_path,
        'rating', p.rating
      ) order by p.sort_order)
      from public.photos p
      where p.album_id = a.id
    ), '[]'::jsonb)
  )
  from public.albums a
  where a.share_token = p_token;
$$;

-- 별점 여러 개를 한 번에 저장 (예: [{"photo_id": "...", "rating": 5}])
create function public.save_ratings(p_token text, p_ratings jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_album public.albums%rowtype;
  v_five_count int;
begin
  -- 같은 앨범에 동시에 저장해도 5점 개수가 꼬이지 않게 잠금
  select * into v_album from public.albums
  where share_token = p_token
  for update;

  if not found then
    raise exception 'ALBUM_NOT_FOUND';
  end if;
  if v_album.submitted_at is not null then
    raise exception 'ALREADY_SUBMITTED';
  end if;

  update public.photos p
  set rating = (r.value ->> 'rating')::smallint
  from jsonb_array_elements(p_ratings) r
  where p.album_id = v_album.id
    and p.id = (r.value ->> 'photo_id')::uuid;

  select count(*) into v_five_count from public.photos
  where album_id = v_album.id and rating = 5;

  -- 한도를 넘으면 이번 저장 전체를 취소
  if v_five_count > v_album.five_star_limit then
    raise exception 'FIVE_STAR_LIMIT';
  end if;
end;
$$;

-- 제출: 이후로는 별점을 바꿀 수 없다
create function public.submit_album(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.albums
  set submitted_at = now()
  where share_token = p_token and submitted_at is null;

  if not found then
    raise exception 'CANNOT_SUBMIT';
  end if;
end;
$$;

revoke execute on function public.get_album(text) from public;
revoke execute on function public.save_ratings(text, jsonb) from public;
revoke execute on function public.submit_album(text) from public;
grant execute on function public.get_album(text) to anon, authenticated;
grant execute on function public.save_ratings(text, jsonb) to anon, authenticated;
grant execute on function public.submit_album(text) to anon, authenticated;
