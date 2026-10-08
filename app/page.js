import Link from 'next/link';

export default function Home() {
  return (
    <div className="container">
      <h1>Tour360</h1>
      <p className="muted">
        Загрузите готовые 360° панорамы по комнатам — получите ссылку на
        онлайн-тур по квартире, который можно отправить клиенту.
      </p>
      <div className="row">
        <Link className="btn" href="/signup">Начать</Link>
        <Link className="btn btn-secondary" href="/login">Войти</Link>
      </div>
    </div>
  );
}
