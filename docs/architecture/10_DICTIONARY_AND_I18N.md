# Dictionary and I18N

- UI text must be resolved through `useI18n()`
- Translation keys must remain flat and namespace-isolated
- Root dictionaries are aggregators only
- Feature modules must update EN and VI together
- No prop-drilled `t()`
- Fallback pattern: `t("key") ?? "Fallback"`

This document defines the minimal constitutional architecture for frontend i18n.
It does not define business copy or runtime behavior.
