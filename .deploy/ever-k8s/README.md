# `.deploy/ever-k8s/` — self-hosted Kubernetes deploy

Deploys Ever Teams to a **self-hosted `ever-k8s`** cluster (bare-metal / Proxmox homelab), **in parallel**
to the DigitalOcean deploy in `.deploy/k8s/` (which is unchanged). Managed by **Argo CD** (GitOps).

**Phase 1 (current):** the stateless `apps/web` Next.js app, pointing at the hosted Gauzy API
(`https://api.ever.team`). Exposed publicly via a Cloudflare Tunnel. No in-cluster DB/Redis/S3 required.

**Phase 2 (later):** run the Gauzy API + PostgreSQL + Redis (Valkey) + object storage (MinIO) in-cluster;
the web image must be **rebuilt** with the in-cluster `NEXT_PUBLIC_GAUZY_API_SERVER_URL` (build-time arg).
