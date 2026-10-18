-- 5점 한도: 비어 있으면(null) 사진 장수의 10%(올림, 최소 1장), 작가가 숫자를 넣으면 그 숫자
alter table public.albums
  alter column five_star_limit drop not null,
  alter column five_star_limit drop default;

-- 실제로 적용되는 한도
create function public.effective_five_star_limit(p_album_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    a.five_star_limit,
    greatest(1, ceil((select count(*) from public.photos p where p.album_id = a.id) * 0.1)::int)
  )
  from public.albums a
  where a.id = p_album_id;
$$;

revoke execute on function public.effective_five_star_limit(uuid) from public, anon;
grant execute on function public.effective_five_star_limit(uuid) to authenticated;

-- 모델 화면에도 실제 한도를 넘긴다
create or replace function public.get_album(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'title', a.title,
    'five_star_limit', public.effective_five_star_limit(a.id),
    'submitted_at', a.submitted_at,
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'filename', p.filename,
        'storage_path', p.storage_path,
        'thumb_path', p.thumb_path,
        'rating', p.rating
      ) order by p.sort_order)
      from public.photos p
      where p.album_id = a.id
    ), '[]'::jsonb)
  )
  from public.albums a
  where a.share_token = p_token;
$$;

-- 5점이 늘어나서 한도를 넘을 때만 막는다
-- (작가가 한도를 낮춰도 모델이 5점을 줄이거나 다른 점수를 매기는 건 계속 되게)
create or replace function public.save_ratings(p_token text, p_ratings jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_album public.albums%rowtype;
  v_before int;
  v_after int;
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

  select count(*) into v_before from public.photos
  where album_id = v_album.id and rating = 5;

  update public.photos p
  set rating = (r.value ->> 'rating')::smallint
  from jsonb_array_elements(p_ratings) r
  where p.album_id = v_album.id
    and p.id = (r.value ->> 'photo_id')::uuid;

  select count(*) into v_after from public.photos
  where album_id = v_album.id and rating = 5;

  -- 한도를 넘으면 이번 저장 전체를 취소
  if v_after > v_before and v_after > public.effective_five_star_limit(v_album.id) then
    raise exception 'FIVE_STAR_LIMIT';
  end if;
end;
$$;
