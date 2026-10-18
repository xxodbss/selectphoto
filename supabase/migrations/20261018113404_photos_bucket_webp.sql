-- 용량을 줄이려고 WebP도 받는다 (WebP를 못 만드는 브라우저는 JPEG로 올림)
update storage.buckets
set allowed_mime_types = array['image/webp', 'image/jpeg']
where id = 'photos';
