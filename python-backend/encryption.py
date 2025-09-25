import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)

class EncryptionService:
    """Service for encrypting and decrypting sensitive data like OAuth tokens"""
    
    def __init__(self):
        self._key = None
        self._fernet = None
        self._initialize_encryption()
    
    def _initialize_encryption(self):
        """Initialize encryption with a key derived from environment variables"""
        # Get encryption key from environment or generate one
        encryption_key = os.getenv("ENCRYPTION_KEY")
        
        if not encryption_key:
            # For development, use a default key (NOT for production!)
            logger.warning("No ENCRYPTION_KEY found in environment. Using default key for development.")
            encryption_key = "dev-encryption-key-change-in-production"
        
        # Derive a proper encryption key using PBKDF2
        salt = b'gmail_integration_salt'  # In production, use a random salt per installation
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        
        key = base64.urlsafe_b64encode(kdf.derive(encryption_key.encode()))
        self._fernet = Fernet(key)
    
    def encrypt(self, data: str) -> str:
        """Encrypt a string and return base64 encoded result"""
        try:
            if not data:
                return ""
            
            encrypted_data = self._fernet.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted_data).decode()
        except Exception as e:
            logger.error(f"Error encrypting data: {e}")
            raise
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt base64 encoded encrypted data and return original string"""
        try:
            if not encrypted_data:
                return ""
            
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self._fernet.decrypt(encrypted_bytes)
            return decrypted_data.decode()
        except Exception as e:
            logger.error(f"Error decrypting data: {e}")
            raise
    
    def encrypt_tokens(self, access_token: str, refresh_token: str) -> tuple[str, str]:
        """Encrypt both access and refresh tokens"""
        encrypted_access = self.encrypt(access_token)
        encrypted_refresh = self.encrypt(refresh_token)
        return encrypted_access, encrypted_refresh
    
    def decrypt_tokens(self, encrypted_access_token: str, encrypted_refresh_token: str) -> tuple[str, str]:
        """Decrypt both access and refresh tokens"""
        access_token = self.decrypt(encrypted_access_token)
        refresh_token = self.decrypt(encrypted_refresh_token)
        return access_token, refresh_token

# Global encryption service instance
encryption_service = EncryptionService()