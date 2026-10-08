'use client';
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { supabase } from '../../../lib/supabaseClient';

// Lets the owner click on a panorama to place an arrow (hotspot) that jumps
// to another room. Click placement uses Pannellum's mouseEventToCoords to
// turn a click into pitch/yaw, which is all a hotspot needs.
export default function HotspotEditor({ panorama, allPanoramas, onClose }) {
  const viewerRef = useRef(null);
  const pannellumRef = useRef(null);
  const [libReady, setLibReady] = useState(false);
  const [hotspots, setHotspots] = useState([]);
  const [pendingCoords, setPendingCoords] = useState(null);
  const [targetId, setTargetId] = useState('');

  const otherPanoramas = allPanoramas.filter((p) => p.id !== panorama.id);

  useEffect(() => {
    loadHotspots();
  }, [panorama.id]);

  async function loadHotspots() {
    const { data } = await supabase
      .from('hotspots')
      .select('*')
      .eq('from_panorama_id', panorama.id);
    setHotspots(data || []);
  }

  useEffect(() => {
    if (!libReady) return;
    const url = supabase.storage.from('panoramas').getPublicUrl(panorama.storage_path).data.publicUrl;
    // eslint-disable-next-line no-undef
    pannellumRef.current = pannellum.viewer(viewerRef.current, {
      type: 'equirectangular',
      panorama: url,
      autoLoad: true,
      compass: false,
    });

    const container = viewerRef.current;
    function handleClick(e) {
      if (!pannellumRef.current) return;
      const coords = pannellumRef.current.mouseEventToCoords(e);
      setPendingCoords({ pitch: coords[0], yaw: coords[1] });
    }
    container.addEventListener('dblclick', handleClick);
    return () => {
      container.removeEventListener('dblclick', handleClick);
      if (pannellumRef.current) pannellumRef.current.destroy();
    };
  }, [libReady, panorama]);

  async function saveHotspot() {
    if (!pendingCoords || !targetId) return;
    await supabase.from('hotspots').insert({
      from_panorama_id: panorama.id,
      target_panorama_id: targetId,
      pitch: pendingCoords.pitch,
      yaw: pendingCoords.yaw,
    });
    setPendingCoords(null);
    setTargetId('');
    loadHotspots();
  }

  async function deleteHotspot(id) {
    await supabase.from('hotspots').delete().eq('id', id);
    loadHotspots();
  }

  function roomName(id) {
    const p = allPanoramas.find((x) => x.id === id);
    return p ? p.room_name : '—';
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"
        onLoad={() => setLibReady(true)}
      />
      <div
        style={{
          padding: 12,
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <strong>{panorama.room_name}</strong>
          <div className="muted">
            Два клика по панораме — поставить стрелку туда, где должен быть переход
          </div>
        </div>
        <button className="btn btn-secondary" onClick={onClose}>Закрыть</button>
      </div>
      <div ref={viewerRef} style={{ flex: 1, position: 'relative' }} />

      {pendingCoords && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 90,
            transform: 'translateX(-50%)',
            background: '#1a1d24',
            border: '1px solid #333',
            borderRadius: 10,
            padding: 16,
            zIndex: 60,
            width: 320,
          }}
        >
          <p className="muted" style={{ marginTop: 0 }}>Куда ведёт эта стрелка?</p>
          <select
            className="input"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value="">Выбери комнату</option>
            {otherPanoramas.map((p) => (
              <option key={p.id} value={p.id}>{p.room_name}</option>
            ))}
          </select>
          <div className="row">
            <button className="btn" onClick={saveHotspot} disabled={!targetId}>Сохранить</button>
            <button className="btn btn-secondary" onClick={() => setPendingCoords(null)}>Отмена</button>
          </div>
        </div>
      )}

      <div
        style={{
          padding: 12,
          background: '#0f1115',
          color: '#fff',
          maxHeight: 140,
          overflowY: 'auto',
        }}
      >
        <p className="muted" style={{ margin: '0 0 8px' }}>Уже добавленные переходы из этой комнаты:</p>
        {hotspots.length === 0 && <p className="muted">Пока нет ни одного</p>}
        {hotspots.map((h) => (
          <div key={h.id} className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <span>→ {roomName(h.target_panorama_id)}</span>
            <button className="btn btn-secondary" onClick={() => deleteHotspot(h.id)}>Удалить</button>
          </div>
        ))}
      </div>
    </div>
  );
}
