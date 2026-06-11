-- DY Group UI Optimization Phase 2
-- Adds storage support for medical leave proof images.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leave-medical-attachments',
  'leave-medical-attachments',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = true,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "Medical attachments are publicly readable" on storage.objects;
create policy "Medical attachments are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'leave-medical-attachments');

drop policy if exists "Users can upload own medical attachments" on storage.objects;
create policy "Users can upload own medical attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'leave-medical-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own medical attachments" on storage.objects;
create policy "Users can update own medical attachments"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'leave-medical-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'leave-medical-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own medical attachments" on storage.objects;
create policy "Users can delete own medical attachments"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'leave-medical-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);
