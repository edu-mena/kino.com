<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>IP bloqueado — Luku</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f7f5f2; color: #241708; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 24px; }
    .card { background: #fff; border-radius: 24px; padding: 40px; max-width: 420px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,.08); }
    .icon { font-size: 40px; }
    h1 { font-size: 20px; margin: 12px 0 8px; }
    code { background: #f1efe9; padding: 2px 8px; border-radius: 8px; font-size: 14px; }
    p { color: #6b6156; font-size: 14px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🚫</div>
    <h1>IP bloqueado</h1>
    <p>O endereço <code>{{ $ip }}</code> já não consegue aceder à página de login de sistema.</p>
    <p>Pode fechar esta janela.</p>
  </div>
</body>
</html>
