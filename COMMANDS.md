<h1 align="center">Команды Usage Limits Bar</h1>

<p align="center"><b>Русский</b> · <a href="COMMANDS.en.md">English</a> · <a href="README.md">← к описанию плагина</a></p>

<p align="center">
  <a href="#показать-и-скрыть-полоску">Показать / скрыть</a> ·
  <a href="#скины">Скины</a> ·
  <a href="#длина-полоски">Длина</a> ·
  <a href="#пороги-цветов">Цвета</a> ·
  <a href="#какие-окна-показывать">Окна</a> ·
  <a href="#время-сброса">Время сброса</a> ·
  <a href="#иконки">Иконки</a> ·
  <a href="#язык">Язык</a> ·
  <a href="#точные-значения">Точные значения</a>
</p>

Все команды вводятся в поле ввода Claude Code. Любая команда без значения показывает текущую настройку и подсказку, например `/limits width` → «Длина полоски: 8 делений. Изменить: /limits width 4…16». Все настройки сохраняются между запусками.

На картинках — пример: 5-часовая сессия израсходована на 36%, неделя — на 50%.

## Показать и скрыть полоску
`/limits` — скрыть полоску, повторный `/limits` — показать снова.

<p align="center"><img src="docs/commands/ru-toggle.png" alt="/limits скрывает полоску" width="70%"></p>

Свернуть полоску можно и сочетанием клавиш Claude Code: **Ctrl+X**, затем **Ctrl+A**.

## Скины
`/limits skin` — список скинов с превью, текущий отмечен `●`.

<p align="center"><img src="docs/commands/ru-skin-list.png" alt="/limits skin показывает список скинов" width="85%"></p>

`/limits skin <номер или имя>` — выбрать скин, например `/limits skin 4` или `/limits skin blocks`.

<p align="center"><img src="docs/commands/ru-skin-set.png" alt="/limits skin 4 включает скин blocks" width="85%"></p>

## Длина полоски
`/limits width 4…16` — длина полоски в делениях, по умолчанию 8.

<p align="center"><img src="docs/commands/ru-width.png" alt="/limits width 12 делает полоску из 12 делений" width="85%"></p>

## Пороги цветов
`/limits colors <жёлтый> <красный>` — с какого процента полоска желтеет и краснеет. По умолчанию 50 и 80: зелёный до 50%, жёлтый до 80%, дальше красный.

<p align="center"><img src="docs/commands/ru-colors.png" alt="/limits colors 40 60: 45% — жёлтый, 62% — красный" width="85%"></p>

Первое число должно быть меньше второго, оба — от 1 до 100. Иначе плагин подскажет правильный формат.

## Какие окна показывать
`/limits show both` — оба окна (по умолчанию), `/limits show 5h` — только 5-часовую сессию, `/limits show 7d` — только неделю.

<p align="center"><img src="docs/commands/ru-show.png" alt="/limits show 7d оставляет только недельный лимит" width="70%"></p>

## Время сброса
`/limits time off` — скрыть время сброса, `/limits time on` — показывать снова (по умолчанию).

<p align="center"><img src="docs/commands/ru-time.png" alt="/limits time off убирает время сброса" width="75%"></p>

## Иконки
`/limits icons nerd` — значки часов, календаря и обновления, `/limits icons off` — выключить. Нужен шрифт Nerd Font в терминале — подробнее в разделе [Иконки](README.md#иконки) описания плагина.

<p align="center"><img src="docs/commands/ru-icons.png" alt="/limits icons nerd включает значки Nerd Font" width="85%"></p>

## Язык
`/limits lang ru` / `en` — русский или английский, `/limits lang auto` — по региональным настройкам системы (по умолчанию).

<p align="center"><img src="docs/commands/ru-lang.png" alt="/limits lang en переключает полоску на английский" width="80%"></p>

## Точные значения
`/limits debug` — проценты, время сброса, когда цифры менялись и когда плагин последний раз их проверял. Удобно, чтобы сверить полоску с `/usage`.

<p align="center"><img src="docs/commands/ru-debug.png" alt="/limits debug показывает точные значения" width="75%"></p>
