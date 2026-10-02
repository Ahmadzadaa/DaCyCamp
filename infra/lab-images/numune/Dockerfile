# Nümunə lab imici — "dacy/numune-lab:latest"
# Qurmaq: pnpm lab:images   (və ya: docker build -t dacy/numune-lab:latest infra/lab-images/numune)
FROM alpine:3.20
RUN apk add --no-cache bash coreutils python3 nano curl \
 && adduser -D -s /bin/bash student
# "check" əmri — platformanın /dacy/check.sh-ə yazdığı yoxlama skriptini işlədir
RUN printf '#!/bin/sh\n[ -f /dacy/check.sh ] && exec sh /dacy/check.sh\necho "Yoxlama skripti yoxdur"\nexit 1\n' > /usr/local/bin/check && chmod 755 /usr/local/bin/check
USER student
WORKDIR /home/student
ENV TERM=xterm-256color LANG=C.UTF-8
# konteyner tələbə qoşulana qədər açıq qalır; platforma vaxt bitəndə silir
CMD ["sleep", "infinity"]
