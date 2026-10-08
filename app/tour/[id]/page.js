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
  const scenesRef = useRef(null);

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
      const list = panoData || [];
      setPanoramas(list);

      const panoramaIds = list.map((p) => p.id);
      const { data: hotspotData } = panoramaIds.length
        ? await supabase.from('hotspots').select('*').in('from_panorama_id', panoramaIds)
        : { data: [] };

      // Build Pannellum's "scenes" config: one scene per room, with
      // clickable arrow hotspots that jump to another scene.
      const scenes = {};
      for (const p of list) {
        const url = supabase.storage.from('panoramas').getPublicUrl(p.storage_path).data.publicUrl;
        const hotSpots = (hotspotData || [])
          .filter((h) => h.from_panorama_id === p.id)
          .map((h) => ({
            pitch: h.pitch,
            yaw: h.yaw,
            type: 'scene',
            sceneId: h.target_panorama_id,
            text: list.find((x) => x.id === h.target_panorama_id)?.room_name || '',
            cssClass: 'tour-hotspot',
          }));
        scenes[p.id] = {
          type: 'equirectangular',
          panorama: url,
          hotSpots,
        };
      }
      scenesRef.current = scenes;

      if (list.length > 0) setActiveId(list[0].id);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!libReady || !scenesRef.current || !activeId) return;
    if (pannellumRef.current) {
      pannellumRef.current.destroy();
    }
    // eslint-disable-next-line no-undef
    pannellumRef.current = pannellum.viewer(viewerRef.current, {
      default: { firstScene: activeId, sceneFadeDuration: 800 },
      scenes: scenesRef.current,
      compass: false,
      showZoomCtrl: true,
    });
    pannellumRef.current.on('scenechange', (sceneId) => setActiveId(sceneId));
  }, [libReady]);

  function goToScene(sceneId) {
    if (pannellumRef.current) pannellumRef.current.loadScene(sceneId);
    setActiveId(sceneId);
  }

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
      <style>{`
        .tour-hotspot {
          width: 44px;
          height: 44px;
          background: rgba(110,168,254,0.9);
          border-radius: 50%;
          border: 2px solid #fff;
          cursor: pointer;
        }
        .tour-hotspot:hover { background: #6ea8fe; }
      `}</style>
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
              onClick={() => goToScene(p.id)}
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
