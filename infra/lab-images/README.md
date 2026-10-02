# Lab imicləri (Mərhələ 3)

Terminal lab addımı (`type: terminal`) hər tələbə üçün `docker_image`-dən **ayrıca konteyner** açır. İmic istənilən Docker imici ola bilər; platforma ona heç nə əlavə etmir, yalnız:

- `/dacy/check.sh` — addımın `check_script` faylı konteynerə yazılır; «Yoxla» düyməsi onu `sh /dacy/check.sh` ilə işlədir, **exit 0 = keçdi**. Skriptin stdout/stderr-i tələbəyə göstərilir.
- Qabıq: `bash` varsa `bash -l`, yoxsa `sh -l`.
- Mühit dəyişənləri: `DACY_LAB=1`, `DACY_SESSION=<id>`, `TERM=xterm-256color`.

## Məhdudiyyətlər (API `.env`)

| Dəyişən                 | Defolt   | Mənası                                      |
| ----------------------- | -------- | ------------------------------------------- |
| `LAB_DRIVER`            | `docker` | `docker` / `mock` (Docker-siz test) / `off` |
| `LAB_MEMORY_MB`         | `512`    | konteyner yaddaşı                           |
| `LAB_CPUS`              | `0.5`    | CPU payı                                    |
| `LAB_PIDS_LIMIT`        | `256`    | proses sayı                                 |
| `LAB_MAX_SESSIONS`      | `20`     | eyni anda işləyən lab sayı                  |
| `LAB_PULL`              | `true`   | imic yoxdursa `docker pull` et              |
| `LAB_CHECK_TIMEOUT_SEC` | `60`     | yoxlama skriptinin maksimum vaxtı           |

Şəbəkə defolt olaraq **bağlıdır** (`NetworkMode: none`); addımın `network: true` sahəsi ilə açılır. Capability-lər minimuma endirilir (`CapDrop ALL` + entrypoint-lər üçün lazım olanlar), `no-new-privileges` qoyulur.

## Nümunə imic

`numune/Dockerfile` — Alpine + bash + python3, `student` istifadəçisi, `check` əmri. Qurmaq:

```bash
pnpm lab:images
# və ya
docker build -t dacy/numune-lab:latest infra/lab-images/numune
```

## Öz imiciniz

```dockerfile
FROM postgres:16-alpine          # və ya python:3.12-slim, ubuntu:24.04 …
RUN adduser -D student           # tələbə root olmasın
COPY raw/ /home/student/raw/     # lab faylları
USER student
WORKDIR /home/student
CMD ["sleep", "infinity"]        # və ya servis (postgres) — konteyner açıq qalmalıdır
```

Yoxlama skripti nümunəsi (`checks/etl_check.sh`, kursun ZIP paketində):

```sh
#!/bin/sh
test -f /home/student/out/orders_clean.csv || { echo "✗ out/orders_clean.csv yoxdur"; exit 1; }
echo "✓ fayl var"
```

API Docker daemon-a `/var/run/docker.sock` ilə qoşulur (docker-compose `--profile full` bunu montaj edir). Uzaq daemon üçün `DOCKER_HOST` verin.
