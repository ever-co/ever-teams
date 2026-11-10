# `.deploy/ever-k8s/` — example self-hosted Kubernetes deploy

An example of running Ever Teams on a **self-hosted Kubernetes** cluster: the stateless `apps/web` Next.js app
(Deployment, Service and Ingress in the namespace `ever-teams`). Set the Ingress host and the Gauzy API URLs to
yours, then `kubectl create namespace ever-teams` (once) and `kubectl apply -k .deploy/ever-k8s`.

It started as Ever's lab deploy on its homelab cluster (`teams-lab.ever.team`), which was retired on 2026-11-10.
Ever's own develop, stage and prod deploys are defined in the GitOps repository `ever-co/k8s-gitops`; nothing
watches this directory.

**As written:** the web app pointing at the hosted Gauzy API (`https://api.ever.team`). No in-cluster
DB/Redis/S3 required.

**Your own API:** run the Gauzy API + PostgreSQL + Redis (Valkey) + object
storage (MinIO) in-cluster; then point `GAUZY_API_SERVER_URL` (used by the
Next.js server) and `NEXT_PUBLIC_GAUZY_API_SERVER_URL` (used by the browser) at
it in the Deployment's `env` and roll out. **No image rebuild**: the published
image bakes nothing deployment-specific and reads every variable,
`NEXT_PUBLIC_*` and branding included, from the container env at runtime (see
the repository `README.md`, "Configure at Runtime", and `.env.docker` for the
full list). Put secrets (`AUTH_SECRET`, `CAPTCHA_SECRET_KEY`, ...) in a Secret
referenced with `envFrom` / `secretKeyRef`.
