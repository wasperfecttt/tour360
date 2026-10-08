'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../../lib/supabaseClient';

export default function TourEditorPage() {
  const { tourId } = useParams();
  const router = useRouter();
  const [tour, setTour] = useState(null);
  const [panoramas, setPanoramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data: tourData, error: tourErr } = await supabase
      .from('tours')
      .select('*')
      .eq('id', tourId)
      .single();
    if (tourErr || !tourData) {
      setError('Тур не найден');
      setLoading(false);
      return;
    }
    setTour(tourData);
    const { data: panoData } = await supabase
      .from('panoramas')
      .select('*')
      .eq('tour_id', tourId)
      .order('sort_order', { ascending: true });
    setPanoramas(panoData || []);
    setLoading(false);
  }, [tourId, router]);

  useEffect(() => { load(); }, [load]);

  async function updateTitle(title) {
    setTour((t) => ({ ...t, title }));
    await supabase.from('tours').update({ title }).eq('id', tourId);
  }

  async function togglePublish() {
    const next = !tour.is_published;
    const { error } = await supabase
      .from('tours')
      .update({ is_published: next })
      .eq('id', tourId);
    if (!error) setTour((t) => ({ ...t, is_published: next }));
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${tourId}/${uuidv4()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('panoramas')
        .upload(path, file, { contentType: file.type });
      if (upErr) {
        setError(`Не удалось загрузить ${file.name}: ${upErr.message}`);
        continue;
      }
      const roomName = file.name.replace(/\.[^/.]+$/, '');
      await supabase.from('panoramas').insert({
        tour_id: tourId,
        room_name: roomName,
        storage_path: path,
        sort_order: panoramas.length + i,
      });
    }
    setUploading(false);
    e.target.value = '';
    load();
  }

  async function renameRoom(id, room_name) {
    setPanoramas((list) => list.map((p) => (p.id === id ? { ...p, room_name } : p)));
    await supabase.from('panoramas').update({ room_name }).eq('id', id);
  }

  async function deletePanorama(p) {
    await supabase.storage.from('panoramas').remove([p.storage_path]);
    await supabase.from('panoramas').delete().eq('id', p.id);
    setPanoramas((list) => list.filter((x) => x.id !== p.id));
  }

  function publicUrl(path) {
    return supabase.storage.from('panoramas').getPublicUrl(path).data.publicUrl;
  }

  if (loading) return <div className="container">Загрузка...</div>;
  if (error && !tour) return <div className="container error">{error}</div>;

  return (
    <div className="container">
      <Link className="muted" href="/dashboard">← Все туры</Link>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
        <input
          className="input"
          style={{ marginBottom: 0, maxWidth: 400 }}
          value={tour.title}
          onChange={(e) => updateTitle(e.target.value)}
        />
        <button className="btn" onClick={togglePublish}>
          {tour.is_published ? 'Снять с публикации' : 'Опубликовать'}
        </button>
      </div>
      {tour.is_published && (
        <p className="muted">
          Ссылка на тур: <Link href={`/tour/${tourId}`} target="_blank">/tour/{tourId}</Link>
        </p>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Панорамы комнат</h3>
        <p className="muted">
          Загрузите готовые equirectangular-панорамы 360° (одно фото = одна комната).
        </p>
        <input type="file" accept="image/*" multiple onChange={handleUpload} disabled={uploading} />
        {uploading && <p className="muted">Загружаем...</p>}
        {error && <div className="error">{error}</div>}
      </div>

      {panoramas.map((p) => (
        <div className="card" key={p.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <img
              src={publicUrl(p.storage_path)}
              alt={p.room_name}
              style={{ width: 120, height: 60, objectFit: 'cover', borderRadius: 6 }}
            />
            <input
              className="input"
              style={{ marginBottom: 0, flex: 1, marginLeft: 12 }}
              value={p.room_name}
              onChange={(e) => renameRoom(p.id, e.target.value)}
            />
            <button className="btn btn-secondary" onClick={() => deletePanorama(p)}>
              Удалить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
