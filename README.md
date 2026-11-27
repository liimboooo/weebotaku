[otakuweeb.me](https://otakuweeb.me/)

## Streaming

Anime streaming is powered by [Anihub-Api](https://github.com/manisbhusal/Anihub-Api), a separate Node.js service that aggregates 13 anime providers. Run it alongside the backend:

```powershell
git clone https://github.com/manisbhusal/Anihub-Api.git
cd Anihub-Api
npm install
echo "PORT=4000" > .env
node server.js
```

Set `ANIHUB_API_URL=http://localhost:4000` in `backend/.env`.
