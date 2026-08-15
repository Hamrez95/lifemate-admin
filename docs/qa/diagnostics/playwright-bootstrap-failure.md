# Temporary ADM-QA-001 Playwright bootstrap diagnostic

This file is generated only when the temporary bootstrap workflow fails and must be removed by the corrective commit.

## update-snapshots output
```text

> lifemate-admin@0.2.0 test:e2e:update
> playwright test --update-snapshots


Running 8 tests using 1 worker

[1/8] [desktop-chromium] › e2e/auth-accessibility-visual.spec.ts:12:5 › protected Command Center redirects an unauthenticated browser to secure login
[2/8] [desktop-chromium] › e2e/auth-accessibility-visual.spec.ts:21:5 › login is Persian RTL, keyboard reachable, validates locally and remains accessible
[desktop-chromium] › e2e/auth-accessibility-visual.spec.ts:21:5 › login is Persian RTL, keyboard reachable, validates locally and remains accessible
A snapshot doesn't exist at /home/runner/work/lifemate-admin/lifemate-admin/e2e/auth-accessibility-visual.spec.ts-snapshots/secure-login-desktop-chromium-linux.png, writing actual.

[3/8] [desktop-chromium] › e2e/auth-accessibility-visual.spec.ts:40:5 › forbidden state explains server-side authorization without leaking backend details
[desktop-chromium] › e2e/auth-accessibility-visual.spec.ts:40:5 › forbidden state explains server-side authorization without leaking backend details
A snapshot doesn't exist at /home/runner/work/lifemate-admin/lifemate-admin/e2e/auth-accessibility-visual.spec.ts-snapshots/forbidden-state-desktop-chromium-linux.png, writing actual.

[4/8] [desktop-chromium] › e2e/mfa-workspace.spec.ts:10:5 › existing account completes OTP then TOTP MFA before an authorized workspace is rendered
  1) [desktop-chromium] › e2e/mfa-workspace.spec.ts:10:5 › existing account completes OTP then TOTP MFA before an authorized workspace is rendered 

    Error: expect(received).toEqual(expected) // deep equality

    - Expected  -   1
    + Received  + 128

    - Array []
    + Array [
    +   Object {
    +     "description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds",
    +     "help": "Elements must meet minimum color contrast ratio thresholds",
    +     "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=playwright",
    +     "id": "color-contrast",
    +     "impact": "serious",
    +     "nodes": Array [
    +       Object {
    +         "all": Array [],
    +         "any": Array [
    +           Object {
    +             "data": Object {
    +               "bgColor": "#eaf8f0",
    +               "contrastRatio": 4.36,
    +               "expectedContrastRatio": "4.5:1",
    +               "fgColor": "#697386",
    +               "fontSize": "7.5pt (10px)",
    +               "fontWeight": "normal",
    +               "messageKey": null,
    +             },
    +             "id": "color-contrast",
    +             "impact": "serious",
    +             "message": "Element has insufficient color contrast of 4.36 (foreground color: #697386, background color: #eaf8f0, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
    +             "relatedNodes": Array [
    +               Object {
    +                 "html": "<div class=\"sidebar__status\" role=\"status\" aria-label=\"وضعیت امنیت نشست مدیریت\"><span class=\"status-dot\" aria-hidden=\"true\"></span><div><strong>نشست AAL2 فعال</strong><span>مجوزها از Admin API دریافت شده‌اند.</span></div></div>",
    +                 "target": Array [
    +                   ".sidebar__status",
    +                 ],
    +               },
    +             ],
    +           },
    +         ],
    +         "failureSummary": "Fix any of the following:
    +   Element has insufficient color contrast of 4.36 (foreground color: #697386, background color: #eaf8f0, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
    +         "html": "<span>مجوزها از Admin API دریافت شده‌اند.</span>",
    +         "impact": "serious",
    +         "none": Array [],
    +         "target": Array [
    +           ".sidebar__status > div > span",
    +         ],
    +       },
    +       Object {
    +         "all": Array [],
    +         "any": Array [
    +           Object {
    +             "data": Object {
    +               "bgColor": "#f4f2ed",
    +               "contrastRatio": 4.26,
    +               "expectedContrastRatio": "4.5:1",
    +               "fgColor": "#697386",
    +               "fontSize": "8.6pt (11.52px)",
    +               "fontWeight": "normal",
    +               "messageKey": null,
    +             },
    +             "id": "color-contrast",
    +             "impact": "serious",
    +             "message": "Element has insufficient color contrast of 4.26 (foreground color: #697386, background color: #f4f2ed, font size: 8.6pt (11.52px), font weight: normal). Expected contrast ratio of 4.5:1",
    +             "relatedNodes": Array [
    +               Object {
    +                 "html": "<kbd>⌘/Ctrl K</kbd>",
    +                 "target": Array [
    +                   "kbd",
    +                 ],
    +               },
    +             ],
    +           },
    +         ],
    +         "failureSummary": "Fix any of the following:
    +   Element has insufficient color contrast of 4.26 (foreground color: #697386, background color: #f4f2ed, font size: 8.6pt (11.52px), font weight: normal). Expected contrast ratio of 4.5:1",
    +         "html": "<kbd>⌘/Ctrl K</kbd>",
    +         "impact": "serious",
    +         "none": Array [],
    +         "target": Array [
    +           "kbd",
    +         ],
    +       },
    +       Object {
    +         "all": Array [],
    +         "any": Array [
    +           Object {
    +             "data": Object {
    +               "bgColor": "#f4f2ed",
    +               "contrastRatio": 4.26,
    +               "expectedContrastRatio": "4.5:1",
    +               "fgColor": "#697386",
    +               "fontSize": "6.8pt (9px)",
    +               "fontWeight": "bold",
    +               "messageKey": null,
    +             },
    +             "id": "color-contrast",
    +             "impact": "serious",
    +             "message": "Element has insufficient color contrast of 4.26 (foreground color: #697386, background color: #f4f2ed, font size: 6.8pt (9px), font weight: bold). Expected contrast ratio of 4.5:1",
    +             "relatedNodes": Array [
    +               Object {
    +                 "html": "<button type=\"button\" class=\"operator-chip__logout\" aria-label=\"خروج از نشست Command Center\">خروج</button>",
    +                 "target": Array [
    +                   ".operator-chip__logout",
    +                 ],
    +               },
    +             ],
    +           },
    +         ],
    +         "failureSummary": "Fix any of the following:
    +   Element has insufficient color contrast of 4.26 (foreground color: #697386, background color: #f4f2ed, font size: 6.8pt (9px), font weight: bold). Expected contrast ratio of 4.5:1",
    +         "html": "<button type=\"button\" class=\"operator-chip__logout\" aria-label=\"خروج از نشست Command Center\">خروج</button>",
    +         "impact": "serious",
    +         "none": Array [],
    +         "target": Array [
    +           ".operator-chip__logout",
    +         ],
    +       },
    +     ],
    +     "tags": Array [
    +       "cat.color",
    +       "wcag2aa",
    +       "wcag143",
    +       "TTv5",
    +       "TT13.c",
    +       "EN-301-549",
    +       "EN-9.1.4.3",
    +       "ACT",
    +       "RGAAv4",
    +       "RGAA-3.2.1",
    +     ],
    +   },
    + ]

      58 |       (violation) => violation.impact === "critical" || violation.impact === "serious",
      59 |     ),
    > 60 |   ).toEqual([]);
         |     ^
      61 |   await expect(page).toHaveScreenshot("authorized-operations-workspace.png", { fullPage: true });
      62 | });
      63 |
        at /home/runner/work/lifemate-admin/lifemate-admin/e2e/mfa-workspace.spec.ts:60:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/playwright/mfa-workspace-existing-acc-c5aec-rized-workspace-is-rendered-desktop-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/playwright/mfa-workspace-existing-acc-c5aec-rized-workspace-is-rendered-desktop-chromium/error-context.md

    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/playwright/mfa-workspace-existing-acc-c5aec-rized-workspace-is-rendered-desktop-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/playwright/mfa-workspace-existing-acc-c5aec-rized-workspace-is-rendered-desktop-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────


[5/8] [mobile-chromium] › e2e/auth-accessibility-visual.spec.ts:12:5 › protected Command Center redirects an unauthenticated browser to secure login
[6/8] [mobile-chromium] › e2e/auth-accessibility-visual.spec.ts:21:5 › login is Persian RTL, keyboard reachable, validates locally and remains accessible
[mobile-chromium] › e2e/auth-accessibility-visual.spec.ts:21:5 › login is Persian RTL, keyboard reachable, validates locally and remains accessible
A snapshot doesn't exist at /home/runner/work/lifemate-admin/lifemate-admin/e2e/auth-accessibility-visual.spec.ts-snapshots/secure-login-mobile-chromium-linux.png, writing actual.

[7/8] [mobile-chromium] › e2e/auth-accessibility-visual.spec.ts:40:5 › forbidden state explains server-side authorization without leaking backend details
[mobile-chromium] › e2e/auth-accessibility-visual.spec.ts:40:5 › forbidden state explains server-side authorization without leaking backend details
A snapshot doesn't exist at /home/runner/work/lifemate-admin/lifemate-admin/e2e/auth-accessibility-visual.spec.ts-snapshots/forbidden-state-mobile-chromium-linux.png, writing actual.

[8/8] [mobile-chromium] › e2e/mfa-workspace.spec.ts:10:5 › existing account completes OTP then TOTP MFA before an authorized workspace is rendered
  2) [mobile-chromium] › e2e/mfa-workspace.spec.ts:10:5 › existing account completes OTP then TOTP MFA before an authorized workspace is rendered 

    Error: expect(received).toEqual(expected) // deep equality

    - Expected  -  1
    + Received  + 95

    - Array []
    + Array [
    +   Object {
    +     "description": "Ensure buttons have discernible text",
    +     "help": "Buttons must have discernible text",
    +     "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/button-name?application=playwright",
    +     "id": "button-name",
    +     "impact": "critical",
    +     "nodes": Array [
    +       Object {
    +         "all": Array [],
    +         "any": Array [
    +           Object {
    +             "data": null,
    +             "id": "button-has-visible-text",
    +             "impact": "critical",
    +             "message": "Element does not have inner text that is visible to screen readers",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "aria-label",
    +             "impact": "critical",
    +             "message": "aria-label attribute does not exist or is empty",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "aria-labelledby",
    +             "impact": "critical",
    +             "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": Object {
    +               "messageKey": "noAttr",
    +             },
    +             "id": "non-empty-title",
    +             "impact": "critical",
    +             "message": "Element has no title attribute",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "implicit-label",
    +             "impact": "critical",
    +             "message": "Element does not have an implicit (wrapped) <label>",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "explicit-label",
    +             "impact": "critical",
    +             "message": "Element does not have an explicit <label>",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "presentational-role",
    +             "impact": "critical",
    +             "message": "Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
    +             "relatedNodes": Array [],
    +           },
    +         ],
    +         "failureSummary": "Fix any of the following:
    +   Element does not have inner text that is visible to screen readers
    +   aria-label attribute does not exist or is empty
    +   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
    +   Element has no title attribute
    +   Element does not have an implicit (wrapped) <label>
    +   Element does not have an explicit <label>
    +   Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
    +         "html": "<button type=\"button\" class=\"global-command-palette-module__WPehia__trigger\" aria-haspopup=\"dialog\" aria-expanded=\"false\"><span aria-hidden=\"true\">⌕</span><span>جست‌وجو و فرمان</span><kbd>⌘/Ctrl K</kbd></button>",
    +         "impact": "critical",
    +         "none": Array [],
    +         "target": Array [
    +           ".global-command-palette-module__WPehia__trigger",
    +         ],
    +       },
    +     ],
    +     "tags": Array [
    +       "cat.name-role-value",
    +       "wcag2a",
    +       "wcag412",
    +       "section508",
    +       "section508.22.a",
    +       "TTv5",
    +       "TT6.a",
    +       "EN-301-549",
    +       "EN-9.4.1.2",
    +       "ACT",
    +       "RGAAv4",
    +       "RGAA-11.9.1",
    +     ],
    +   },
    + ]

      58 |       (violation) => violation.impact === "critical" || violation.impact === "serious",
      59 |     ),
    > 60 |   ).toEqual([]);
         |     ^
      61 |   await expect(page).toHaveScreenshot("authorized-operations-workspace.png", { fullPage: true });
      62 | });
      63 |
        at /home/runner/work/lifemate-admin/lifemate-admin/e2e/mfa-workspace.spec.ts:60:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/playwright/mfa-workspace-existing-acc-c5aec-rized-workspace-is-rendered-mobile-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/playwright/mfa-workspace-existing-acc-c5aec-rized-workspace-is-rendered-mobile-chromium/error-context.md

    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/playwright/mfa-workspace-existing-acc-c5aec-rized-workspace-is-rendered-mobile-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/playwright/mfa-workspace-existing-acc-c5aec-rized-workspace-is-rendered-mobile-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────


  2 failed
    [desktop-chromium] › e2e/mfa-workspace.spec.ts:10:5 › existing account completes OTP then TOTP MFA before an authorized workspace is rendered 
    [mobile-chromium] › e2e/mfa-workspace.spec.ts:10:5 › existing account completes OTP then TOTP MFA before an authorized workspace is rendered 
  6 passed (23.7s)

```

## verification output
```text
Verification did not run.

```
