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
`/limits width 4…16` — длина полоски в делениях, по умолчанию 8. Чем длиннее полоска, тем точнее видно расход, но тем больше места она занимает.

**4 — самая короткая**

<p align="center"><img src="docs/commands/ru-width-4.png" alt="/limits width 4" width="564"></p>

**8 — по умолчанию**

<p align="center"><img src="docs/commands/ru-width-8.png" alt="/limits width 8" width="648"></p>

**16 — самая длинная**

<p align="center"><img src="docs/commands/ru-width-16.png" alt="/limits width 16" width="816"></p>

## Пороги цветов
`/limits colors <жёлтый> <красный>` — с какого процента полоска желтеет и краснеет. В скобках — какого цвета на картинке каждое окно.

**50 и 80 — по умолчанию: зелёный до 50%, жёлтый до 80%, дальше красный** (45% — зелёный, 75% — жёлтый)

<p align="center"><img src="docs/commands/ru-colors-50-80.png" alt="/limits colors 50 80" width="788"></p>

**70 и 90 — спокойнее: зелёный до 70%, жёлтый до 90%, дальше красный** (68% — ещё зелёный, 85% — ещё жёлтый; при порогах по умолчанию были бы жёлтый и красный)

<p align="center"><img src="docs/commands/ru-colors-70-90.png" alt="/limits colors 70 90" width="788"></p>

**30 и 60 — строже: жёлтый уже с 30%, красный с 60%** (45% — жёлтый, 75% — красный)

<p align="center"><img src="docs/commands/ru-colors-30-60.png" alt="/limits colors 30 60" width="788"></p>

Первое число должно быть меньше второго, оба — от 1 до 100. Иначе плагин подскажет правильный формат.

## Какие окна показывать
`/limits show <значение>` — какие лимиты выводить в полоске.

**`both` — оба окна (по умолчанию)**

<p align="center"><img src="docs/commands/ru-show-both.png" alt="/limits show both" width="648"></p>

**`5h` — только 5-часовая сессия**

<p align="center"><img src="docs/commands/ru-show-5h.png" alt="/limits show 5h" width="462"></p>

**`7d` — только неделя**

<p align="center"><img src="docs/commands/ru-show-7d.png" alt="/limits show 7d" width="462"></p>

## Время сброса
`/limits time <значение>` — показывать ли время, когда лимит снова обнулится.

**`on` — показывать (по умолчанию)**

<p align="center"><img src="docs/commands/ru-time-on.png" alt="/limits time on" width="648"></p>

**`off` — скрыть**

<p align="center"><img src="docs/commands/ru-time-off.png" alt="/limits time off" width="441"></p>

## Иконки
`/limits icons nerd` — значки часов, календаря и обновления, `/limits icons off` — выключить. Нужен шрифт Nerd Font в терминале — подробнее в разделе [Иконки](README.md#иконки) описания плагина.

<p align="center"><img src="docs/commands/ru-icons.png" alt="/limits icons nerd включает значки Nerd Font" width="85%"></p>

## Язык
`/limits lang ru` / `en` — русский или английский, `/limits lang auto` — по региональным настройкам системы (по умолчанию).

**`ru` — русский**

<p align="center"><img src="docs/commands/ru-lang-ru.png" alt="/limits lang ru" width="648"></p>

**`en` — английский**

<p align="center"><img src="docs/commands/ru-lang-en.png" alt="/limits lang en" width="669"></p>

## Точные значения
`/limits debug` — проценты, время сброса, когда цифры менялись и когда плагин последний раз их проверял. Удобно, чтобы сверить полоску с `/usage`.

<p align="center"><img src="docs/commands/ru-debug.png" alt="/limits debug показывает точные значения" width="75%"></p>
