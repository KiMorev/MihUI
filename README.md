# MihUI

Локальный редактор `proxy-providers` и связей `proxy-groups/use` для Mihomo.

## Установка на роутер

MihUI ставится как отдельный локальный UI рядом с Mihomo и не занимает порт `9090`.
По умолчанию используется порт `9878`; если он занят, установщик выберет свободный порт из диапазона `9879-9899`.
На роутере нужны `python3`, `wget` или `curl`, а также `tar`. Если `python3` не найден, установщик попробует поставить его через Entware `opkg`.

```sh
cd /tmp
wget -O mihui-router.tar.gz https://github.com/KiMorev/MihUI/releases/latest/download/mihui-router.tar.gz
rm -rf mihui-router
mkdir -p mihui-router
tar -xzf mihui-router.tar.gz -C mihui-router
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

Скрипт скачивает свежий `mihui-router.tar.gz` из GitHub Releases и заменяет файлы UI в `/opt/etc/mihui`.

## Удаление

```sh
sh /opt/etc/mihui/uninstall.sh
```

Удаление останавливает сервис, убирает `/opt/etc/mihui` и наш init-скрипт.
Логи остаются в `/opt/var/log/mihui` для ручной проверки.
