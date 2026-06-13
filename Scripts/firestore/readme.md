# Firestore maintenance scripts

These scripts are intended to be run manually by Andrew from a local machine.

Always run without `--apply` first to perform a dry run.

Use explicit project credentials and confirm the target Firebase project before applying changes.

## Query and optionally delete documents

Run:

```bash
node query-and-delete.js
```

The script lists available top-level collections, then infers field names from the first 50
documents in the selected collection. You can choose a listed option or type the collection/field
manually. It then asks for text the field should contain, scans the collection, prints up to 100
matching documents, and deletes only if you type `Yes` at the final confirmation prompt.

Firestore does not support substring `contains` queries on arbitrary string fields, so this script
reads the selected collection and filters matches locally.
