# Track 11B Phase 11B.7 — SaaS Connectors

**Status:** Implemented (Airtable + Shopify pilots)  
**Code:** `connectors/_saas.py`, `airtable_connector.py`, `shopify_connector.py`

---

## Connectors

| Type | API | Notes |
|------|-----|-------|
| `airtable` | Airtable REST v0 | Base + table records, offset pagination |
| `shopify` | Admin REST 2024-01 | orders/products/customers/inventory_items |

---

## Airtable config

| Field | Notes |
|-------|-------|
| `baseId` | Airtable base ID |
| `tableName` | Table name |
| `view` | Optional view filter |
| `inline_records` | Test-only Airtable-shaped records |

**Credentials:** `apiKey` (Personal Access Token)

---

## Shopify config

| Field | Notes |
|-------|-------|
| `shopDomain` | e.g. `mystore.myshopify.com` |
| `resource` | `orders`, `products`, `customers`, `inventory_items` |
| `inline_records` | Test-only resource rows |

**Credentials:** `adminApiKey`

---

## Tests

```bash
python -m pytest tests/test_saas_connectors.py -q
npm run validate:track11:pytest
```

Additional SaaS apps (Zoho, Tally, etc.) can follow the same `_saas.py` pattern.
