"""Password hashing for Campus Customs.

The supplied database already holds accounts hashed with PBKDF2-HMAC-SHA256,
stored as `pbkdf2_sha256$<salt>$<hex digest>`. Everything here matches that
scheme exactly so that seeded accounts and accounts created through the app are
interchangeable — the same function produces the stored value at signup and
recomputes it at login, which is the only way to be sure the two cannot drift
apart.

Three properties matter and are deliberate:

* **The password is never stored, and never recoverable.** PBKDF2 is one-way.
  Login does not decrypt anything; it re-runs the same computation on what the
  visitor typed and compares the results.
* **Every account has its own salt.** Two people who choose the same password
  get different stored hashes, so cracking one reveals nothing about the other
  and precomputed rainbow tables are useless.
* **120,000 iterations.** The work factor is what makes guessing expensive. It
  must match the seeded data exactly or those accounts can never log in.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets

ALGORITHM = "pbkdf2_sha256"

#: Must match the supplied database. Overriding this invalidates seeded logins.
ITERATIONS = int(os.getenv("PBKDF2_ITERATIONS", "120000"))

#: 16 hex characters of cryptographically random salt per new account.
SALT_BYTES = 8


def _derive(password: str, salt: str, iterations: int) -> str:
    """The one computation both signup and login go through."""
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations
    ).hex()


def hash_password(password: str, *, salt: str | None = None) -> str:
    """Return the storable `pbkdf2_sha256$salt$hash` value for a new password."""
    salt = salt or secrets.token_hex(SALT_BYTES)
    return f"{ALGORITHM}${salt}${_derive(password, salt, ITERATIONS)}"


def verify_password(password: str, stored: str) -> bool:
    """Check a typed password against a stored hash.

    The stored value is split to recover the salt — the hash itself is never
    reversed — the candidate is re-derived with that same salt and iteration
    count, and the two digests are compared in constant time so that the
    comparison leaks nothing about how much of the hash matched.
    """
    try:
        algorithm, salt, digest = stored.split("$", 2)
    except (ValueError, AttributeError):
        return False
    if algorithm != ALGORITHM:
        return False
    return hmac.compare_digest(_derive(password, salt, ITERATIONS), digest)
