# Track 11 Phase 11.7 — CSV & Excel Connectors

**Status:** Implemented (CSV + Excel; other DB connectors pending)  
**Code:** `apps/integrations/connectors/csv_connector.py`, `excel_connector.py`

---

## Connectors

| Type | Notes |
|------|-------|
| `csv` | Reads via `storage_object_id` or inline test payload |
| `excel` | Single sheet via openpyxl; defaults to first sheet |

Shared loader: `connectors/_files.py` (type inference, batch slicing, storage download).

---

## Config

**CSV**
- `storage_object_id` (UUID)
- `has_header` (default true)
- `delimiter` (default `,`)
- `encoding` (default `utf-8`)
- `table_name` (default `csv_data`)

**Excel**
- `storage_object_id` (UUID)
- `sheet_name` (optional — first sheet)
- `has_header` (default true)
- `table_name` (defaults to sheet name)

Test-only: `inline_text` / `inline_b64` for unit tests without storage.

---

## Dependency

`openpyxl>=3.1` in `backend/requirements.txt`

---

## Tests

```bash
cd backend
python -m pytest tests/test_csv_excel_connectors.py -q
```
