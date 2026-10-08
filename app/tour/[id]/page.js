'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Script from 'next/script';
import { supabase } from '../../../lib/supabaseClient';

export default function PublicTourPage() {
  const { id } = useParams();
  const viewerRef = useRef(null);
  const pannellumRef = useRef(null);
  const [tour, setTour] = useState(null);
  const [panoramas, setPanoramas] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState('');
  const [libReady, setLibReady] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: tourData, error: tourErr } = await supabase
        .from('tours')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .single();
      if (tourErr || !tourData) {
        setError('Тур не найден или ещё не опубликован');
        return;
      }
      setTour(tourData);
      const { data: panoData } = await supabase
        .from('panoramas')
        .select('*')
        .eq('tour_id', id)
        .order('sort_order', { ascending: true });
      setPanoramas(panoData || []);
      if (panoData && panoData.length > 0) setActiveId(panoData[0].id);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!libReady || panoramas.length === 0 || !activeId) return;
    const active = panoramas.find((p) => p.id === activeId);
    if (!active) return;
    const url = supabase.storage.from('panoramas').getPublicUrl(active.storage_path).data.publicUrl;

    if (pannellumRef.current) {
      pannellumRef.current.destroy();
    }
    // eslint-disable-next-line no-undef
    pannellumRef.current = pannellum.viewer(viewerRef.current, {
      type: 'equirectangular',
      panorama: url,
      autoLoad: true,
      compass: false,
      showZoomCtrl: true,
    });
  }, [libReady, activeId, panoramas]);

  if (error) {
    return <div className="container error">{error}</div>;
  }
  if (!tour) {
    return <div className="container">Загрузка тура...</div>;
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"
        onLoad={() => setLibReady(true)}
      />
      <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
        <div ref={viewerRef} style={{ position: 'absolute', inset: 0 }} />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '14px 16px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
            color: '#fff',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <strong>{tour.title}</strong>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '12px 16px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
            zIndex: 2,
          }}
        >
          {panoramas.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveId(p.id)}
              style={{
                whiteSpace: 'nowrap',
                padding: '8px 14px',
                borderRadius: 20,
                border: 'none',
                background: p.id === activeId ? '#6ea8fe' : 'rgba(255,255,255,0.15)',
                color: p.id === activeId ? '#0f1115' : '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {p.room_name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
