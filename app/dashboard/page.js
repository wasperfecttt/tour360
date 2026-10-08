'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
    await loadTours();
    setLoading(false);
  }

  async function loadTours() {
    const { data } = await supabase
      .from('tours')
      .select('*')
      .order('created_at', { ascending: false });
    setTours(data || []);
  }

  async function createTour() {
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('tours')
      .insert({ owner_id: user.id, title: 'Новый тур' })
      .select()
      .single();
    setCreating(false);
    if (!error && data) {
      router.push(`/dashboard/${data.id}`);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <div className="container">Загрузка...</div>;

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Мои туры</h2>
        <button className="btn btn-secondary" onClick={signOut}>Выйти</button>
      </div>
      <button className="btn" onClick={createTour} disabled={creating}>
        {creating ? 'Создаём...' : '+ Новый тур'}
      </button>
      <div style={{ marginTop: 20 }}>
        {tours.length === 0 && <p className="muted">Туров пока нет.</p>}
        {tours.map((tour) => (
          <div className="card" key={tour.id}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong>{tour.title}</strong>
                <div className="muted">
                  {tour.is_published ? 'Опубликован' : 'Черновик'}
                </div>
              </div>
              <div className="row">
                <Link className="btn btn-secondary" href={`/dashboard/${tour.id}`}>
                  Редактировать
                </Link>
                {tour.is_published && (
                  <Link className="btn" href={`/tour/${tour.id}`} target="_blank">
                    Открыть тур
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
