import os
import hashlib
import hmac

ITERATIONS = 100000
HASH_NAME = 'sha256'

def hash_password(password: str) -> str:
    """
    Hashes a password securely using PBKDF2-HMAC-SHA256 with a random salt.
    Format returned: iterations$salt_hex$hash_hex
    """
    salt = os.urandom(16)
    pw_hash = hashlib.pbkdf2_hmac(
        HASH_NAME,
        password.encode('utf-8'),
        salt,
        ITERATIONS
    )
    return f"{ITERATIONS}${salt.hex()}${pw_hash.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    """
    Verifies a password against the stored secure PBKDF2 hash.
    """
    try:
        parts = stored_hash.split('$')
        if len(parts) != 3:
            return False
            
        iterations = int(parts[0])
        salt = bytes.fromhex(parts[1])
        original_hash = bytes.fromhex(parts[2])
        
        new_hash = hashlib.pbkdf2_hmac(
            HASH_NAME,
            password.encode('utf-8'),
            salt,
            iterations
        )
        
        # Prevent timing attacks using compare_digest
        return hmac.compare_digest(original_hash, new_hash)
    except Exception:
        return False
