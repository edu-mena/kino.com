<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Avisar os utilizadores — Luku</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f7f5f2; color: #241708; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 24px; }
    .card { background: #fff; border-radius: 24px; padding: 32px; max-width: 460px; box-shadow: 0 10px 30px rgba(0,0,0,.08); }
    .icon { font-size: 36px; text-align: center; }
    h1 { font-size: 20px; margin: 12px 0 8px; text-align: center; }
    p { color: #6b6156; font-size: 14px; line-height: 1.5; }
    .preview { background: #f1efe9; border-radius: 16px; padding: 16px; margin: 16px 0; }
    .preview strong { display: block; color: #241708; margin-bottom: 6px; }
    button { width: 100%; border: 0; border-radius: 14px; padding: 14px; font-size: 15px; font-weight: 700; color: #fff; background: #1f4d3a; cursor: pointer; }
    .muted { text-align: center; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    @if($state === 'confirm')
      <div class="icon">{{ $phase === 'started' ? '📣' : '😄' }}</div>
      <h1>Enviar este aviso aos utilizadores?</h1>
      <p>Vai por push a quem tem notificações ligadas e por email a quem se inscreveu em /estado ou tem um pedido/reserva em curso.</p>
      <div class="preview">
        <strong>{{ $message['title'] }}</strong>
        {{ $message['body'] }}
      </div>
      <form method="post" action="{{ $actionUrl }}">
        <button type="submit">Sim, enviar aviso</button>
      </form>
      <p class="muted">Se não quiser enviar, basta fechar esta janela.</p>
    @elseif($state === 'sent')
      <div class="icon">✅</div>
      <h1>Aviso enviado</h1>
      <p class="muted">Os utilizadores foram avisados. Pode fechar esta janela.</p>
    @else
      <div class="icon">ℹ️</div>
      <h1>Já não é preciso enviar</h1>
      <p class="muted">Este aviso já foi enviado, ou o incidente mudou de estado entretanto (ex.: já foi resolvido). Veja em /sistema/estado.</p>
    @endif
  </div>
</body>
</html>
