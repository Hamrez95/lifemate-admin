# Temporary ADM-QA-001 Playwright bootstrap diagnostic

This file is generated only when the temporary bootstrap workflow fails and must be removed by the corrective commit.

## update-snapshots output
```text
olor-contrast",
    +             "impact": "serious",
    +             "message": "Element has insufficient color contrast of 4.32 (foreground color: #0d8a52, background color: #fffdf9, font size: 7.5pt (10px), font weight: bold). Expected contrast ratio of 4.5:1",
    +             "relatedNodes": Array [
    +               Object {
    +                 "html": "<section class=\"workspace-placeholder\" aria-labelledby=\"workspace-placeholder-title\">",
    +                 "target": Array [
    +                   "section",
    +                 ],
    +               },
    +             ],
    +           },
    +         ],
    +         "failureSummary": "Fix any of the following:
    +   Element has insufficient color contrast of 4.32 (foreground color: #0d8a52, background color: #fffdf9, font size: 7.5pt (10px), font weight: bold). Expected contrast ratio of 4.5:1",
    +         "html": "<p class=\"eyebrow\">Vertical slice pending</p>",
    +         "impact": "serious",
    +         "none": Array [],
    +         "target": Array [
    +           "section > .eyebrow",
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
    +   Object {
    +     "description": "Ensure links have discernible text",
    +     "help": "Links must have discernible text",
    +     "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/link-name?application=playwright",
    +     "id": "link-name",
    +     "impact": "serious",
    +     "nodes": Array [
    +       Object {
    +         "all": Array [],
    +         "any": Array [
    +           Object {
    +             "data": null,
    +             "id": "has-visible-text",
    +             "impact": "serious",
    +             "message": "Element does not have text that is visible to screen readers",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "aria-label",
    +             "impact": "serious",
    +             "message": "aria-label attribute does not exist or is empty",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "aria-labelledby",
    +             "impact": "serious",
    +             "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": Object {
    +               "messageKey": "noAttr",
    +             },
    +             "id": "non-empty-title",
    +             "impact": "serious",
    +             "message": "Element has no title attribute",
    +             "relatedNodes": Array [],
    +           },
    +         ],
    +         "failureSummary": "Fix all of the following:
    +   Element is in tab order and does not have accessible text
    +
    + Fix any of the following:
    +   Element does not have text that is visible to screen readers
    +   aria-label attribute does not exist or is empty
    +   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
    +   Element has no title attribute",
    +         "html": "<a class=\"nav-item\" data-active=\"false\" href=\"/\"><span class=\"nav-item__symbol\" aria-hidden=\"true\">⌂</span><span>مرکز فرماندهی</span></a>",
    +         "impact": "serious",
    +         "none": Array [
    +           Object {
    +             "data": null,
    +             "id": "focusable-no-name",
    +             "impact": "serious",
    +             "message": "Element is in tab order and does not have accessible text",
    +             "relatedNodes": Array [],
    +           },
    +         ],
    +         "target": Array [
    +           "a[href=\"/\"]",
    +         ],
    +       },
    +       Object {
    +         "all": Array [],
    +         "any": Array [
    +           Object {
    +             "data": null,
    +             "id": "has-visible-text",
    +             "impact": "serious",
    +             "message": "Element does not have text that is visible to screen readers",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "aria-label",
    +             "impact": "serious",
    +             "message": "aria-label attribute does not exist or is empty",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "aria-labelledby",
    +             "impact": "serious",
    +             "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": Object {
    +               "messageKey": "noAttr",
    +             },
    +             "id": "non-empty-title",
    +             "impact": "serious",
    +             "message": "Element has no title attribute",
    +             "relatedNodes": Array [],
    +           },
    +         ],
    +         "failureSummary": "Fix all of the following:
    +   Element is in tab order and does not have accessible text
    +
    + Fix any of the following:
    +   Element does not have text that is visible to screen readers
    +   aria-label attribute does not exist or is empty
    +   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
    +   Element has no title attribute",
    +         "html": "<a class=\"nav-item\" data-active=\"false\" href=\"/users\"><span class=\"nav-item__symbol\" aria-hidden=\"true\">◎</span><span>کاربران</span></a>",
    +         "impact": "serious",
    +         "none": Array [
    +           Object {
    +             "data": null,
    +             "id": "focusable-no-name",
    +             "impact": "serious",
    +             "message": "Element is in tab order and does not have accessible text",
    +             "relatedNodes": Array [],
    +           },
    +         ],
    +         "target": Array [
    +           "a[href$=\"users\"]",
    +         ],
    +       },
    +       Object {
    +         "all": Array [],
    +         "any": Array [
    +           Object {
    +             "data": null,
    +             "id": "has-visible-text",
    +             "impact": "serious",
    +             "message": "Element does not have text that is visible to screen readers",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "aria-label",
    +             "impact": "serious",
    +             "message": "aria-label attribute does not exist or is empty",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "aria-labelledby",
    +             "impact": "serious",
    +             "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": Object {
    +               "messageKey": "noAttr",
    +             },
    +             "id": "non-empty-title",
    +             "impact": "serious",
    +             "message": "Element has no title attribute",
    +             "relatedNodes": Array [],
    +           },
    +         ],
    +         "failureSummary": "Fix all of the following:
    +   Element is in tab order and does not have accessible text
    +
    + Fix any of the following:
    +   Element does not have text that is visible to screen readers
    +   aria-label attribute does not exist or is empty
    +   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
    +   Element has no title attribute",
    +         "html": "<a class=\"nav-item\" data-active=\"false\" href=\"/analytics\"><span class=\"nav-item__symbol\" aria-hidden=\"true\">◇</span><span>تحلیل محصول</span></a>",
    +         "impact": "serious",
    +         "none": Array [
    +           Object {
    +             "data": null,
    +             "id": "focusable-no-name",
    +             "impact": "serious",
    +             "message": "Element is in tab order and does not have accessible text",
    +             "relatedNodes": Array [],
    +           },
    +         ],
    +         "target": Array [
    +           "a[href$=\"analytics\"]",
    +         ],
    +       },
    +       Object {
    +         "all": Array [],
    +         "any": Array [
    +           Object {
    +             "data": null,
    +             "id": "has-visible-text",
    +             "impact": "serious",
    +             "message": "Element does not have text that is visible to screen readers",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "aria-label",
    +             "impact": "serious",
    +             "message": "aria-label attribute does not exist or is empty",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "aria-labelledby",
    +             "impact": "serious",
    +             "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": Object {
    +               "messageKey": "noAttr",
    +             },
    +             "id": "non-empty-title",
    +             "impact": "serious",
    +             "message": "Element has no title attribute",
    +             "relatedNodes": Array [],
    +           },
    +         ],
    +         "failureSummary": "Fix all of the following:
    +   Element is in tab order and does not have accessible text
    +
    + Fix any of the following:
    +   Element does not have text that is visible to screen readers
    +   aria-label attribute does not exist or is empty
    +   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
    +   Element has no title attribute",
    +         "html": "<a class=\"nav-item\" data-active=\"true\" aria-current=\"page\" href=\"/operations\"><span class=\"nav-item__symbol\" aria-hidden=\"true\">⚙</span><span>عملیات</span></a>",
    +         "impact": "serious",
    +         "none": Array [
    +           Object {
    +             "data": null,
    +             "id": "focusable-no-name",
    +             "impact": "serious",
    +             "message": "Element is in tab order and does not have accessible text",
    +             "relatedNodes": Array [],
    +           },
    +         ],
    +         "target": Array [
    +           "a[data-active=\"true\"]",
    +         ],
    +       },
    +       Object {
    +         "all": Array [],
    +         "any": Array [
    +           Object {
    +             "data": null,
    +             "id": "has-visible-text",
    +             "impact": "serious",
    +             "message": "Element does not have text that is visible to screen readers",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "aria-label",
    +             "impact": "serious",
    +             "message": "aria-label attribute does not exist or is empty",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "aria-labelledby",
    +             "impact": "serious",
    +             "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": Object {
    +               "messageKey": "noAttr",
    +             },
    +             "id": "non-empty-title",
    +             "impact": "serious",
    +             "message": "Element has no title attribute",
    +             "relatedNodes": Array [],
    +           },
    +         ],
    +         "failureSummary": "Fix all of the following:
    +   Element is in tab order and does not have accessible text
    +
    + Fix any of the following:
    +   Element does not have text that is visible to screen readers
    +   aria-label attribute does not exist or is empty
    +   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
    +   Element has no title attribute",
    +         "html": "<a class=\"nav-item\" data-active=\"false\" href=\"/ai\"><span class=\"nav-item__symbol\" aria-hidden=\"true\">✦</span><span>مشاور هوش مصنوعی</span><span class=\"nav-item__badge\">جدید</span></a>",
    +         "impact": "serious",
    +         "none": Array [
    +           Object {
    +             "data": null,
    +             "id": "focusable-no-name",
    +             "impact": "serious",
    +             "message": "Element is in tab order and does not have accessible text",
    +             "relatedNodes": Array [],
    +           },
    +         ],
    +         "target": Array [
    +           "a[href=\"/ai\"]",
    +         ],
    +       },
    +       Object {
    +         "all": Array [],
    +         "any": Array [
    +           Object {
    +             "data": null,
    +             "id": "has-visible-text",
    +             "impact": "serious",
    +             "message": "Element does not have text that is visible to screen readers",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "aria-label",
    +             "impact": "serious",
    +             "message": "aria-label attribute does not exist or is empty",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": null,
    +             "id": "aria-labelledby",
    +             "impact": "serious",
    +             "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty",
    +             "relatedNodes": Array [],
    +           },
    +           Object {
    +             "data": Object {
    +               "messageKey": "noAttr",
    +             },
    +             "id": "non-empty-title",
    +             "impact": "serious",
    +             "message": "Element has no title attribute",
    +             "relatedNodes": Array [],
    +           },
    +         ],
    +         "failureSummary": "Fix all of the following:
    +   Element is in tab order and does not have accessible text
    +
    + Fix any of the following:
    +   Element does not have text that is visible to screen readers
    +   aria-label attribute does not exist or is empty
    +   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
    +   Element has no title attribute",
    +         "html": "<a class=\"nav-item\" data-active=\"false\" href=\"/settings\"><span class=\"nav-item__symbol\" aria-hidden=\"true\">≡</span><span>تنظیمات</span></a>",
    +         "impact": "serious",
    +         "none": Array [
    +           Object {
    +             "data": null,
    +             "id": "focusable-no-name",
    +             "impact": "serious",
    +             "message": "Element is in tab order and does not have accessible text",
    +             "relatedNodes": Array [],
    +           },
    +         ],
    +         "target": Array [
    +           "a[href$=\"settings\"]",
    +         ],
    +       },
    +     ],
    +     "tags": Array [
    +       "cat.name-role-value",
    +       "wcag2a",
    +       "wcag244",
    +       "wcag412",
    +       "section508",
    +       "section508.22.a",
    +       "TTv5",
    +       "TT6.a",
    +       "EN-301-549",
    +       "EN-9.2.4.4",
    +       "EN-9.4.1.2",
    +       "ACT",
    +       "RGAAv4",
    +       "RGAA-6.2.1",
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


  6 failed
    [desktop-chromium] › e2e/auth-accessibility-visual.spec.ts:21:5 › login is Persian RTL, keyboard reachable, validates locally and remains accessible 
    [desktop-chromium] › e2e/auth-accessibility-visual.spec.ts:40:5 › forbidden state explains server-side authorization without leaking backend details 
    [desktop-chromium] › e2e/mfa-workspace.spec.ts:10:5 › existing account completes OTP then TOTP MFA before an authorized workspace is rendered 
    [mobile-chromium] › e2e/auth-accessibility-visual.spec.ts:21:5 › login is Persian RTL, keyboard reachable, validates locally and remains accessible 
    [mobile-chromium] › e2e/auth-accessibility-visual.spec.ts:40:5 › forbidden state explains server-side authorization without leaking backend details 
    [mobile-chromium] › e2e/mfa-workspace.spec.ts:10:5 › existing account completes OTP then TOTP MFA before an authorized workspace is rendered 
  2 passed (29.9s)

```

## verification output
```text
Verification did not run.

```
