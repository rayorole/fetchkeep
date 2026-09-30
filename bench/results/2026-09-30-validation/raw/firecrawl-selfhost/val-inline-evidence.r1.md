Archive recovery notes
======================

The operator reads `archive.lock` before opening the **recovery journal**.

A successful restore preserves the original timestamp and the owner’s signature.

Never replace a verified snapshot with an incomplete copy.