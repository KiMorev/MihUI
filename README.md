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

Кнопка `Обновить UI` проверяет свежий релиз и запускает обновление через локальный API MihUI.

```text
POST /api/update/start
```

Скрипт скачивает свежий `mihui-router.tar.gz` из GitHub Releases и заменяет файлы UI в `/opt/etc/mihui`.

## Конфиг Mihomo

По умолчанию MihUI читает и сохраняет:

```text
/opt/etc/mihomo/config.yaml
```

После сохранения MihUI пробует перезагрузить Mihomo через `http://127.0.0.1:9090`.
Переопределения можно задать в `/opt/etc/mihui/mihui.env`:

```sh
MIHUI_CONFIG_PATH="/opt/etc/mihomo/config.yaml"
MIHUI_MIHOMO_API="http://127.0.0.1:9090"
MIHUI_MIHOMO_SECRET=""
```

Перед каждым сохранением создается бэкап, хранятся последние 5.

## Удаление

```sh
sh /opt/etc/mihui/uninstall.sh
```

Удаление останавливает сервис, убирает `/opt/etc/mihui` и наш init-скрипт.
Логи остаются в `/opt/var/log/mihui` для ручной проверки.
