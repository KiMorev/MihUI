# MihUI

Локальный редактор `proxy-providers` и связей `proxy-groups/use` для Mihomo.

## Установка на роутер

MihUI ставится как отдельный локальный UI рядом с Mihomo и не занимает порт `9090`.
По умолчанию используется порт `9878`; если он занят, установщик выберет свободный порт из диапазона `9879-9899`.
На роутере нужны `busybox httpd` с CGI, `wget` или `curl`, а также `unzip`.

```sh
cd /tmp
wget -O mihui-router.zip https://github.com/KiMorev/MihUI/releases/latest/download/mihui-router.zip
rm -rf mihui-router
unzip -q mihui-router.zip -d mihui-router
sh /tmp/mihui-router/install.sh
```

После установки откройте:

```text
http://<router-ip>:9878/
```

Если установщик выбрал другой порт, он покажет его в конце установки.

## Обновление

Кнопка `Обновить UI` вызывает локальный endpoint MihUI:

```text
POST /cgi-bin/mihui-update
```

Скрипт скачивает свежий `mihui-router.zip` из GitHub Releases и заменяет файлы UI в `/opt/etc/mihui`.

## Удаление

```sh
sh /opt/etc/mihui/uninstall.sh
```

Удаление останавливает сервис, убирает `/opt/etc/mihui` и наш init-скрипт.
Логи остаются в `/opt/var/log/mihui` для ручной проверки.
