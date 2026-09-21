# Embedding on Squarespace (thegreaterrockwell.org)

The calendar app has a built-in embed mode — `?embed=1` on the site URL
strips the header, nav, and footer, leaving just the calendar widget, and
the page posts its height to the parent window so the iframe auto-resizes
(no scrollbars, no fixed height to guess at). See
`packages/web/src/web/pages/index.tsx` (`isEmbed`) and `app.tsx`.

## 1. Add a Code Block in Squarespace

In the page/section where the calendar should appear:
**Insert → Code** (not "Embed" — Squarespace's Code Block is the one that
accepts raw HTML/JS on every plan tier), then paste:

```html
<iframe
  id="community-calendar"
  src="https://georgec-508brmt-preview-4200.runable.site/?embed=1"
  style="width:100%; border:0; display:block;"
  height="1200"
  loading="lazy"
  title="Community Calendar"
></iframe>
<script>
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "wpcalendarcats:resize") {
      var f = document.getElementById("community-calendar");
      if (f) f.style.height = e.data.height + "px";
    }
  });
</script>
```

That's it — the script listens for the resize message the embedded page
already sends and grows the iframe to fit, so the calendar never scrolls
inside its own box.

## 2. Swap in the production URL once deployed

The `src` above points at the **current preview URL**
(`https://georgec-508brmt-preview-4200.runable.site/`), which is George's
Runable preview deploy — good for testing the embed today, but it can
change when the app is redeployed. Once this is deployed to its permanent
domain (Railway custom domain or `calendar.40thward.org`, see `RAILWAY.md`),
update just the `src` attribute to that URL + `?embed=1` and nothing else
changes.

## 3. Everything else works as normal

Category filters, search, Cards/Calendar toggle, and dark mode all work
inside the embed exactly as on the full site — visitors filter or search
right inside the iframe. There's currently no URL parameter to pre-filter
to one category on load; that would need a small code change if wanted.
