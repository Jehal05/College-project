"""SQLAlchemy column types that encrypt on the way in and decrypt on the way out.

The database only ever holds ciphertext. Because every encryption uses a fresh
random value, you cannot search or sort by an encrypted column.
"""
import json

from sqlalchemy import LargeBinary, Text
from sqlalchemy.types import TypeDecorator

from app.security.crypto import decrypt_bytes, decrypt_text, encrypt_bytes, encrypt_text


class EncryptedText(TypeDecorator):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return None if value is None else encrypt_text(str(value))

    def process_result_value(self, value, dialect):
        return None if value is None else decrypt_text(value)


class EncryptedJSON(TypeDecorator):
    """For lists and dicts, for example a list of conditions."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return None if value is None else encrypt_text(json.dumps(value))

    def process_result_value(self, value, dialect):
        return None if value is None else json.loads(decrypt_text(value))


class EncryptedBytes(TypeDecorator):
    """For uploaded files (reports). The database holds only the encrypted bytes."""
    impl = LargeBinary
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return None if value is None else encrypt_bytes(bytes(value))

    def process_result_value(self, value, dialect):
        return None if value is None else decrypt_bytes(value)
