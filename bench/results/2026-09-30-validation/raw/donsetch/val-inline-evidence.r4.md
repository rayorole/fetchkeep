# Archive recovery notes
http://172.31.172.243:45387/validation/inline-evidence.html

The operator reads `archive.lock` before opening the **recovery journal**.

A successful restore preserves the original timestamp and the owner’s signature.

Never replace a verified snapshot with an incomplete copy.