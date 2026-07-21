# Frontend — KVM2 (k3s)

Full cluster bootstrap order (namespace, secrets, Cloudflare origin cert,
ingress, Redis, first apply) lives in `Bharat-Mock-Backend/k8s/README.md` —
this file only covers what's specific to the frontend.

## GitHub repo settings needed for `.github/workflows/deploy-frontend.yml`

**Secrets** (Settings → Secrets and variables → Actions → *Secrets* tab —
same three values as the backend repo, since both deploy to the same KVM2):
- `KVM2_HOST`, `KVM2_SSH_USER`, `KVM2_SSH_KEY`

**Variables**, not secrets — these are `NEXT_PUBLIC_*` and get compiled
directly into client-side JS, so anyone can already read them from the
shipped bundle; storing them as GitHub *secrets* would just hide them from
the Actions log for no actual confidentiality benefit (Settings → Secrets
and variables → Actions → *Variables* tab):
- `NEXT_PUBLIC_API_URL` → `https://api.bharatmock.com/api/v1`
- `NEXT_PUBLIC_SITE_URL` → `https://bharatmock.com`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

## Runtime secret

`GOOGLE_CLOUD_TRANSLATION_API_KEY` is the one server-only, non-`NEXT_PUBLIC_`
secret this app needs — it's read at runtime, not baked into the image, so it
goes into the `frontend-secret` k8s Secret on the server (see the backend
repo's README, step 3), never into GitHub Actions at all.

## First apply (once, after the backend's namespace/ingress/Redis are up)

```bash
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/frontend-hpa.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

After that, `git push` to `main` is the entire deploy process.
