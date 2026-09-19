# `.deploy/ever-k8s/` — self-hosted Kubernetes deploy

Deploys Ever Teams to a **self-hosted `ever-k8s`** cluster (bare-metal / Proxmox homelab), **in parallel**
to the DigitalOcean deploy in `.deploy/k8s/` (which is unchanged). Managed by **Argo CD** (GitOps).

**Phase 1 (current):** the stateless `apps/web` Next.js app, pointing at the hosted Gauzy API
(`https://api.ever.team`). Exposed publicly via a Cloudflare Tunnel. No in-cluster DB/Redis/S3 required.

**Phase 2 (later):** run the Gauzy API + PostgreSQL + Redis (Valkey) + object
storage (MinIO) in-cluster; then point `GAUZY_API_SERVER_URL` (used by the
Next.js server) and `NEXT_PUBLIC_GAUZY_API_SERVER_URL` (used by the browser) at
it in the Deployment's `env` and roll out. **No image rebuild**: the published
image bakes nothing deployment-specific and reads every variable,
`NEXT_PUBLIC_*` and branding included, from the container env at runtime (see
the repository `README.md`, "Configure at Runtime", and `.env.docker` for the
full list). Put secrets (`AUTH_SECRET`, `CAPTCHA_SECRET_KEY`, ...) in a Secret
referenced with `envFrom` / `secretKeyRef`.
