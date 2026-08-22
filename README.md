# lumagarden

Одностраничный статический сайт для проверки того, что домен подключён и работает.

## Локальный запуск

```bash
python3 -m http.server 8000
```

Затем открыть http://localhost:8000

## Публикация

GitHub Pages: Settings → Pages → Source: `Deploy from a branch` → ветка `main`, папка `/ (root)`.
Для своего домена добавьте файл `CNAME` с одной строкой (например `lumagarden.com`) и A/CNAME-записи у регистратора.
