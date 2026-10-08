'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="container">
        <h2>Проверьте почту</h2>
        <p className="muted">
          Мы отправили письмо для подтверждения на {email}. После подтверждения
          можно будет войти.
        </p>
        <Link className="btn" href="/login">К странице входа</Link>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Регистрация</h2>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Пароль (мин. 6 символов)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Создаём...' : 'Создать аккаунт'}
        </button>
      </form>
      <p className="muted">
        Уже есть аккаунт? <Link href="/login">Войти</Link>
      </p>
    </div>
  );
}
