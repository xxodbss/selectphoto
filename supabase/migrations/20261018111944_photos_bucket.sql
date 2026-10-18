-- 사진 저장소: 공개(주소를 알면 보임), 경로는 "앨범ID/무작위이름.jpg"
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg']);

-- 작가는 자기 앨범 폴더의 사진만 올리고, 보고, 지울 수 있다 (폴더 목록은 남에게 안 보임)
create policy "작가는 자기 앨범 폴더의 사진만" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.albums a
      where a.id::text = (storage.foldername(name))[1]
        and a.owner_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'photos'
    and exists (
      select 1 from public.albums a
      where a.id::text = (storage.foldername(name))[1]
        and a.owner_id = (select auth.uid())
    )
  );
