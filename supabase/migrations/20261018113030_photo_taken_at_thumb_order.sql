-- 촬영 시간(EXIF)과 썸네일 위치
alter table public.photos
  add column taken_at timestamptz,
  add column thumb_path text not null;

-- 숫자를 숫자로 비교하는 정렬 (DSC_2 < DSC_10)
create collation public.natural (provider = icu, locale = 'und-u-kn-true');

-- 앨범 사진 순서 다시 매기기: 촬영 시간순, 시간이 없으면 파일명 숫자순
-- security invoker라서 표 보안 규칙대로 작가 자기 앨범에만 적용된다
create function public.reorder_photos(p_album_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.photos p
  set sort_order = o.rn
  from (
    select id, row_number() over (
      order by taken_at nulls last, filename collate public.natural, created_at
    ) as rn
    from public.photos
    where album_id = p_album_id
  ) o
  where p.id = o.id;
$$;

revoke execute on function public.reorder_photos(uuid) from public, anon;
grant execute on function public.reorder_photos(uuid) to authenticated;

-- 모델 화면에 썸네일 주소도 넘긴다
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
        'rating', p.rating
      ) order by p.sort_order)
      from public.photos p
      where p.album_id = a.id
    ), '[]'::jsonb)
  )
  from public.albums a
  where a.share_token = p_token;
$$;
