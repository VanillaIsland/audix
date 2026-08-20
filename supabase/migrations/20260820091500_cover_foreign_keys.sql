create index listening_history_media_id_idx
  on public.listening_history(media_id);

create index playlist_items_media_id_idx
  on public.playlist_items(media_id);
