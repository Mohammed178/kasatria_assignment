# Troubleshooting log

Problems hit while building this project, what actually caused them, and how
they were fixed. Written down because several of them produced error messages
that pointed at the wrong thing.

---

## 1. No tiles rendered at all, in any layout

**Symptoms:** the scene opened, the menu and legend appeared, the background
went black, and nothing else. No error in the console. Every layout was empty.

**What it looked like:** a problem with the tile building or the layout maths.

**Actual cause:** a silent breaking change in `@tweenjs/tween.js` v25.

`dist/tween.esm.js`:

```js
if (typeof group === 'object') { this._group = group; group.add(this); }
// Use "true" to restore old behavior (will be removed in future release).
else if (group === true) { this._group = mainGroup; mainGroup.add(this); }
```

`new Tween(obj)` with no second argument **no longer joins the global group**,
so `TWEEN.update()` never advances it. The three.js demo this project forked
was written against tween.js v18, where it did.

The fatal part is how the demo drives rendering. It does not render every
frame; it renders from a tween callback:

```js
new TWEEN.Tween({}).to({}, duration * 2).onUpdate(render).start();
```

That tween never ran, so `render()` was never called. `CSS3DRenderer` only
appends its elements to the DOM during `render()`, so no tiles ever existed.
Tiles were being built correctly the whole time and added to the scene graph;
they simply were never drawn.

**How it was found:** `document.querySelectorAll('.element').length` returned
`0` while `createPersonTile()` called directly returned a valid `CSS3DObject`.
That ruled out tile construction and pointed at the render path.

**Fix:** use the explicit group API rather than the removed implicit default.

```js
import { Tween, Easing, Group } from '@tweenjs/tween.js';

const tweens = new Group();

new Tween(object.position, tweens).to(...).start();

function animate() {
    requestAnimationFrame(animate);
    tweens.update();
}
```

Also added a plain `render()` call at the end of `initScene()`, so tiles appear
even if no transition is running.

**Lesson:** when porting an old demo, the library versions matter as much as
the code. This one failed silently, with no error and no warning.

---

## 2. Grid layout swallowed the camera

**Symptoms:** switching to Grid showed tiles streaking outward past the edges
of the screen, as if flying through them.

**Cause:** exactly that. The brief's suggested formula is

```js
object.position.z = (Math.floor(i / 20) * 1000) - 4500;
```

which spans z from -4500 to +4500, a block 9000 units deep. The camera sat at
z = 3400, i.e. inside it.

**Fix:** reduced the depth spacing from 1000 to 400 (block now +/-1800) and
moved the camera to z = 4000, which clears the deepest layout while still
fitting the 20 column table.

**Related:** the helix needed tuning for the same reason. At the suggested
twist of `0.235` rad/step it made ~3.7 turns and packed into an unreadable
cylinder. `0.16` rad/step with a rise of 13 gives ~2.5 turns, which leaves a
gap between successive turns of one strand for the other strand to sit in, so
the double helix actually reads as one.

---

## 3. Sign-in card stayed on screen and the app looked frozen

**Symptoms**

- Signed in successfully, then the page sat on "Fetching sheet..." forever.
- The four layout buttons, the info bar and the legend appeared, but the Google
  sign-in card was still there on top.
- Nothing responded to dragging. The app looked hung.

**What it looked like:** a failed or hanging network request.

**Actual cause:** the sign-in card was never hidden.

`main.js` hid it with the `hidden` attribute:

```js
signinView.hidden = true;
```

That relies on the browser's built-in rule `[hidden] { display: none }`. But
`style.css` declared:

```css
#signin-view { display: flex; }
```

Author stylesheets always beat user-agent stylesheets, so `display: flex` won
and `hidden` did nothing.

Everything downstream followed from that:

- The card is `min-height: 100vh` and was in normal document flow, so
  `#scene-view` laid out *below the fold*. `body.scene-active` sets
  `overflow: hidden`, so it could not be scrolled to. The scene was rendering
  perfectly, just unreachable, which is why it felt frozen.
- `#menu`, `#info` and `#legend` are `position: absolute` with no positioned
  ancestor, so they anchored to the viewport instead of the scene. That is why
  the chrome appeared over the card while the tiles did not.
- `setStatus()` was never called again after `'Fetching sheet...'`, so the card
  kept showing that stale message indefinitely. The fetch had already
  succeeded.

`CSS3DRenderer` sets only `overflow: hidden` on its `domElement`, no
`position`, so it is a plain static block in flow. That is what allowed the
scene to stack below rather than overlay.

**Fix**

```css
/* Make the hidden attribute authoritative everywhere. */
[hidden] { display: none !important; }

/* Take the scene out of flow: fills the viewport, and becomes the containing
   block for its own overlays. */
#scene-view { position: fixed; inset: 0; }
```

Plus `setStatus('')` at the top of `startScene()`.

**Lesson:** setting `.hidden = true` is not reliable on any element that has an
author `display` rule. Either restate `[hidden]` globally, or hide via a class.

**Confirming it was not the network:** the info bar was visible and already
read `200 people: 21 red / 86 orange / 93 green`. That proved auth, fetch and
parsing had all completed, and moved the search to the presentation layer.

---

## 4. `Unable to parse range` from the Sheets API

**Symptoms**

```
Sheets API 400: {
  "error": {
    "code": 400,
    "message": "Unable to parse range: Sheet1!A1:F201",
    "status": "INVALID_ARGUMENT"
  }
}
```

**What it looked like:** malformed A1 notation.

**Actual cause:** the tab name did not exist. Google returns "Unable to parse
range" both for genuinely malformed ranges *and* for a tab it cannot find,
which sends you looking at the string instead of the spreadsheet.

The tab had been renamed during setup, so the configured name was stale.

**Fix:** stop configuring the tab name at all. `sheets.js` now reads it at
runtime:

```js
GET /v4/spreadsheets/{id}?fields=sheets.properties.title
```

then composes `'{title}'!{range}` itself. `VITE_SHEET_RANGE` holds only the A1
part (`A1:F201`); any tab prefix left in it is stripped.

This removed a whole class of failure, since the name previously had to stay in
sync across three places (the sheet, `.env`, and Vercel) with no error message
pointing at the mismatch.

---

## 5. dotenv silently truncated a quoted range

**Symptoms:** while the tab was named `Assessment Data Template`, the API kept
rejecting the range even though `.env` looked correct.

**Actual cause:** A1 notation requires single quotes around tab names
containing spaces:

```
'Assessment Data Template'!A1:F201
```

But dotenv treats a leading `'` as a string delimiter. It parsed the value as
`Assessment Data Template` and **discarded `!A1:F201` entirely**. No warning.

**How it was caught:** grepping the built bundle for the inlined constant
rather than trusting the `.env` file:

```sh
npm run build && grep -o "c=\`[^\`]*\`" dist/assets/*.js
```

Vite inlines `import.meta.env` values at build time, so the bundle shows the
value the app will actually use.

**Fix at the time:** wrap the whole value in double quotes so the inner single
quotes survive.

```
VITE_SHEET_RANGE="'Assessment Data Template'!A1:F201"
```

Note the Vercel dashboard field takes the literal string and does no dotenv
parsing, so it needed the value *without* the outer wrapper. Three places, three
different quoting rules.

Superseded by fix 2, which removed the tab name from config entirely.

---

## 6. Browser served a stale module after an `.env` change

**Symptoms:** after correcting `.env` and restarting the dev server, the app
still produced the old value in its error message.

**Cause:** Vite caches transformed ES modules aggressively, both on disk and in
the browser. A normal reload does not evict them.

**Fix**

```sh
rm -rf node_modules/.vite
npm run dev -- --force
```

then hard reload in the browser (Ctrl+Shift+R).

**Diagnosing which layer is stale:** in dev, Vite injects env values into the
served module source, so this shows what the browser is actually getting:

```sh
curl -s http://localhost:5173/src/sheets.js | head -1
```

If that line is correct but the browser still misbehaves, the stale copy is in
the browser, not the server.

---

## 7. Vite dev server does not pick up `.env` changes

`.env` is read once at server start. Editing it while `npm run dev` is running
has no effect, and the symptom is indistinguishable from a wrong value.

Restart the dev server after any `.env` edit.

The same applies to Vercel: env vars are inlined at build time, so a change in
the dashboard does nothing until a redeploy.

---

## 8. Closing the Google account chooser locked the sign-in button

**Symptoms:** open the app, click "Sign in with Google", close the account
selection popup without picking an account. The button stays greyed out and the
status stays on "Requesting access...". Clicking it again does nothing. Only a
full page reload makes signing in possible again.

**What it looked like:** a stuck disabled attribute on the button.

**Actual cause:** the GIS token client never settles the promise on a dismissed
popup. `initTokenClient` has two separate handlers:

- `callback` fires only on a completed flow (granted or explicitly denied).
- `error_callback` fires for `popup_closed`, `popup_failed_to_open` and
  `unknown`.

`auth.js` set only `callback`, so a closed popup produced no call at all. The
`await requestAccessToken()` in `signInAndLoad()` never resolved or rejected,
the `catch` block that re-enables the button was never reached, and the promise
was left pending forever.

**Fix:** set `error_callback` per request alongside `callback`, guard both with
a `settled` flag so whichever fires first wins, and map the GIS error type to a
readable message.

```js
tokenClient.error_callback = (error) => {
    settle(reject, new Error(ERROR_MESSAGES[error?.type] || 'Sign-in failed. Try again.'));
};
```

`main.js` also re-enables the button in a `finally` rather than the `catch`, so
a throw anywhere in the flow, including inside `startScene()`, still leaves the
button usable.

**Lesson:** a promise wrapped around a callback API needs every terminal path
covered. One unhandled path is not an error, it is a hang, which is harder to
spot because nothing is logged.

---

## 9. Tiles could not be clicked with a real mouse, but worked under automation

**Symptoms:** clicking a tile did nothing. The tile highlighted on hover, so it
was receiving pointer events, and the console was clean. Driving the same click
through Chrome DevTools automation opened the detail panel every time, which
made it look like a machine-specific or stale-build problem.

**Actual cause:** `TrackballControls` takes pointer capture.

`node_modules/three/examples/jsm/controls/TrackballControls.js`:

```js
function onPointerDown( event ) {
    if ( this._pointers.length === 0 ) {
        this.domElement.setPointerCapture( event.pointerId );
        ...
```

`domElement` is the `CSS3DRenderer` div. Once it has captured the pointer,
every later pointer event in that sequence, including `pointerup`, is
**retargeted to the renderer div**. The click handler was doing:

```js
const tile = event.target.closest('.element');   // always null
```

`event.target` is the renderer, which is an *ancestor* of the tiles, so
`closest()` never matched and the handler returned early every time.

**Why automation hid it:** CDP-synthesized mouse input does not produce an
active pointer for capture purposes. Logging `rendererEl.hasPointerCapture(id)`
during a synthetic click returns `false` at both `pointerdown` and `pointerup`,
so the target was never retargeted and the buggy code path looked correct. Only
a real mouse reproduces it.

**Fix:** stop using the event target. Hit test the release point, and keep the
element the press landed on as a fallback.

```js
const released = document.elementFromPoint(event.clientX, event.clientY);
const tile = released?.closest?.('.element') || pressedTile;
```

`elementFromPoint` is pure hit testing and is unaffected by pointer capture.
The `pressedTile` fallback is safe because capture only affects *subsequent*
events, so the `pointerdown` event itself still carries the real target.

**Lesson:** a passing automated check is not proof when the automation does not
reproduce the input semantics. Pointer capture, drag and drop, hover intent and
focus follow different paths for synthetic events.

**Testing without Google:** `npm run dev` then `/?demo` loads a generated
dataset through the same `startScene` path, so the scene, the pop-out and sign
out can be exercised without an account. The branch is behind
`import.meta.env.DEV`, so Vite drops it and `demoData.js` from production
builds. Verified with `grep -c "Demo Person\|demoPeople" dist/assets/*.js`,
which returns 0.

---

## Recurring lesson

Three of the five problems above produced an error message that pointed at the
wrong layer:

| Message | Suggested | Actually was |
|---|---|---|
| Empty scene, no error | Tile or layout code | tween.js v25 dropping the implicit group |
| Stuck on "Fetching sheet..." | Network / API | CSS `display` beating `[hidden]` |
| `Unable to parse range` | Malformed A1 string | Tab name did not exist |
| Stale value after `.env` fix | Config still wrong | Module cache |
| Sign-in button stays disabled | Button state bug | Promise never settled, GIS reports popup dismissal on a second handler |
| Tile clicks ignored, hover fine | Stale build or bad coordinates | TrackballControls pointer capture retargeting `pointerup` |

The technique that resolved all three was the same: **verify what the running
code actually contains**, rather than what the source says it should. Grep the
built bundle, curl the served module, check the rendered state, and only then
reason about behaviour.
