# Peppol Invoice Interpreter

Interface web locale pour lire une facture UBL (Peppol) et afficher:

- En-tête de facture
- Fournisseur
- Client
- Lignes de facture
- Totaux
- PDF embarqué (si présent)

## Lancer en local (sans Docker)

```bash
python3 -m http.server 4173
```

Puis ouvrir `http://localhost:4173`.

## Lancer avec Docker

### Build + run (Docker)

```bash
docker build -t peppol-invoice-interpreter .
docker run --rm -p 4173:80 peppol-invoice-interpreter
```

### Docker Compose

```bash
docker compose up -d --build
```

Puis ouvrir `http://localhost:4173`.

## Notes Docker

Le conteneur inclut aussi:

- `service-worker.js` (stub no-op)
- `/.well-known/appspecific/com.chrome.devtools.json`

pour éviter les erreurs 404 fréquentes émises par Chrome sur certains postes.
