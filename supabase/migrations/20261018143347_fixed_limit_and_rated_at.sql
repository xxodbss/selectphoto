-- 5점 한도는 다시 앨범을 만들 때 작가가 정하는 고정값 (10% 자동 계산은 되돌림)
update public.albums set five_star_limit = 10 where five_star_limit is null;
alter table public.albums
  alter column five_star_limit set default 10,
  alter column five_star_limit set not null;

-- 별점을 누른 시각 (휴대폰 기준 밀리초)
-- 늦게 도착한 옛 요청이 최신 별점을 덮어쓰지 않게, 이 시각보다 오래된 변경은 무시한다
alter table public.photos add column rated_at bigint not null default 0;

-- 모델 화면: 한도는 저장된 값 그대로, 사진마다 별점 누른 시각도 넘긴다 (휴대폰에 보관한 별점과 비교용)
create or replace function public.get_album(p_token text)
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
        'thumb_path', p.thumb_path,
        'rating', p.rating,
        'rated_at', p.rated_at
      ) order by p.sort_order)
      from public.photos p
      where p.album_id = a.id
    ), '[]'::jsonb)
  )
  from public.albums a
  where a.share_token = p_token;
$$;

-- 별점 저장: [{"photo_id": "...", "rating": 5, "rated_at": 1760000000000}]
-- 저장된 것보다 새로 누른 별점만 반영, 5점이 늘어나서 한도를 넘으면 전체 취소
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
  set rating = (r.value ->> 'rating')::smallint,
      rated_at = (r.value ->> 'rated_at')::bigint
  from jsonb_array_elements(p_ratings) r
  where p.album_id = v_album.id
    and p.id = (r.value ->> 'photo_id')::uuid
    and (r.value ->> 'rated_at')::bigint > p.rated_at;

  select count(*) into v_after from public.photos
  where album_id = v_album.id and rating = 5;

  if v_after > v_before and v_after > v_album.five_star_limit then
    raise exception 'FIVE_STAR_LIMIT';
  end if;
end;
$$;

drop function public.effective_five_star_limit(uuid);
