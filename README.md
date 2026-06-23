# WebMihomo

Локальный редактор `proxy-providers` и связей `proxy-groups/use` для Mihomo.

## Установка как Mihomo external-ui

В релизах проекта публикуется архив `webmihomo-ui.zip`. Для обновления из меню WebMihomo укажите его в конфиге Mihomo:

```yaml
external-controller: 0.0.0.0:9090
external-ui: ./ui
external-ui-url: "https://github.com/KiMorev/MihUI/releases/latest/download/webmihomo-ui.zip"
```

После этого кнопка `Обновить UI` вызывает штатный Mihomo API:

```text
POST /upgrade/ui
```

Если в Mihomo задан `secret`, браузер запросит его при первом обновлении вкладки.
