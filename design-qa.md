# Design QA — rules registry

- Source visual truth: `audit-rules-redesign-2026-07-11/selected-hybrid.png`
- Implementation screenshot: `audit-rules-redesign-2026-07-11/03-implementation-selected-rule.png`
- Full-view comparison: `audit-rules-redesign-2026-07-11/04-comparison.png`
- Focused comparison: `audit-rules-redesign-2026-07-11/05-focused-comparison.png`
- Viewport: 1440 × 900.
- State: router mock, `config (4).yaml`, «Маршрутизация → Правила», правило 26 (MATCH → PROXY) выбрано.

## Findings

No actionable P0, P1 or P2 findings remain.

- Typography: passed. Заголовок, сводка, строки реестра и инспектор используют действующую типографическую шкалу WebMihomo.
- Spacing and layout: passed. Реестр остаётся главным рабочим блоком, инспектор — вторичным; панель инструментов и четыре колонки соответствуют выбранному гибриду.
- Colors and tokens: passed. Использованы существующие нейтральные поверхности, бирюзовый акцент и цветовые ярлыки DIRECT, REJECT и PROXY.
- Image and icon fidelity: passed. Растровых материалов в целевом макете нет; использованы существующие SVG-иконки проекта.
- Copy and content: passed. Сводка 23 DIRECT, 2 REJECT, 1 PROXY и состояние порядка строятся из загруженной конфигурации.
- Interactions: passed. Выбор правила, фильтрация по цели, открытие и закрытие режима редактирования работают без создания изменений.
- Responsive behavior: passed by code review. На узких экранах реестр и инспектор складываются вертикально, второстепенные размеры колонок сокращаются без горизонтального переполнения.
- Accessibility: passed for the implemented scope. Строки правил доступны с клавиатуры, фильтры имеют подписи, а графический статус получает `aria-label` и `title` без видимого текста «Корректно».

## Intentional product constraints

- В реальном реестре используется прокрутка всех 26 правил; синтетический разрыв «…» из макета не воспроизводится, потому что он скрывал бы реальные строки и нарушал управление порядком.
- В компактной таблице состояние показано только маркером. Полное объяснение корректности и назначения правила находится в инспекторе справа.
- Редактирование остаётся явным режимом инспектора, чтобы случайный выбор строки не менял YAML.

## Comparison history

### Iteration 1

- P2: подписи фильтров и счётчик результатов визуально перегружали компактную панель.
- Fix: подписи сохранены для доступности, но убраны из визуального потока; панель сведена к поиску, двум фильтрам и основной кнопке.
- P2: у строк реестра был лишний `role=listitem`, не соответствующий кнопочной модели выбора.
- Fix: оставлены нативные кнопки строк и доступные имена состояний.
- Evidence after fixes: `audit-rules-redesign-2026-07-11/03-implementation-selected-rule.png` and `audit-rules-redesign-2026-07-11/05-focused-comparison.png`.

## Verification

- `node --check app.js`: passed.
- `npm.cmd test`: 110/110 passed.
- Main/standalone synchronization: passed.
- Browser console warnings/errors: none.
- Browser scenarios: выбор правила, фильтр PROXY, вход и выход из режима редактирования passed.

final result: passed
