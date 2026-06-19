import os
import uuid
import shutil
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException
from PIL import Image

class ImageService:
    def __init__(self):
        # Create upload directories
        self.base_upload_dir = "backend/static/uploads"
        self.patient_dir = os.path.join(self.base_upload_dir, "patients")
        self.therapist_dir = os.path.join(self.base_upload_dir, "therapists")
        self.clinic_dir = os.path.join(self.base_upload_dir, "clinics")
        
        # Create directories if they don't exist
        os.makedirs(self.patient_dir, exist_ok=True)
        os.makedirs(self.therapist_dir, exist_ok=True)
        os.makedirs(self.clinic_dir, exist_ok=True)
        
        # Allowed formats
        self.allowed_formats = ["image/jpeg", "image/png", "image/jpg"]
        self.max_file_size = 5 * 1024 * 1024  # 5MB
        
    def validate_image(self, file: UploadFile) -> None:
        """Validate uploaded image file"""
        # Check file size
        if file.size and file.size > self.max_file_size:
            raise HTTPException(status_code=413, detail="File size too large. Maximum 5MB allowed.")
        
        # Read file content to validate format
        try:
            file_content = file.file.read()
            file.file.seek(0)  # Reset file pointer
            
            # Check MIME type using python-magic (fallback to basic check if not available)
            try:
                import magic
                mime_type = magic.from_buffer(file_content, mime=True)
                if mime_type not in self.allowed_formats:
                    raise HTTPException(status_code=415, detail="Invalid file format. Only JPG, JPEG, PNG allowed.")
            except ImportError:
                # Fallback to basic file extension check if python-magic is not available
                if not file.filename:
                    raise HTTPException(status_code=400, detail="Filename is required.")
                
                ext = os.path.splitext(file.filename)[1].lower()
                if ext not in ['.jpg', '.jpeg', '.png']:
                    raise HTTPException(status_code=415, detail="Invalid file format. Only JPG, JPEG, PNG allowed.")
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            else:
                raise HTTPException(status_code=400, detail=f"Error validating file: {str(e)}")
    
    def generate_filename(self, original_filename: str) -> str:
        """Generate unique filename"""
        ext = os.path.splitext(original_filename)[1].lower()
        if not ext:
            ext = '.jpg'
        return f"{uuid.uuid4()}{ext}"
    
    def resize_image(self, file_path: str, max_size: Tuple[int, int] = (800, 800)) -> None:
        """Resize image while maintaining aspect ratio"""
        try:
            from PIL import Image
            with Image.open(file_path) as img:
                # Convert to RGB if necessary
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Calculate new size maintaining aspect ratio
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                # Save optimized image
                img.save(file_path, 'JPEG', optimize=True, quality=85)
        except ImportError:
            # If PIL is not available, skip resizing
            print("Warning: PIL not available, skipping image resize")
            pass
        except Exception as e:
            print(f"Warning: Error resizing image: {str(e)}")
            # Don't raise error, just continue with original image
            pass
    
    async def save_image(self, file: UploadFile, user_type: str, user_id: int, old_filename: Optional[str] = None) -> str:
        """Save uploaded image and return filename"""
        print(f"📸 Starting image save: user_type={user_type}, user_id={user_id}")
        
        self.validate_image(file)
        
        # Choose directory based on user type
        type_mapping = {
            'patient': self.patient_dir,
            'therapist': self.therapist_dir,
            'clinic': self.clinic_dir
        }
        
        upload_dir = type_mapping.get(user_type)
        if not upload_dir:
            raise HTTPException(status_code=400, detail=f"Invalid user type: {user_type}")
        
        print(f"📁 Upload directory: {upload_dir}")
        
        # Ensure directory exists
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        filename = self.generate_filename(file.filename)
        file_path = os.path.join(upload_dir, filename)
        
        print(f"💾 Saving to: {file_path}")
        
        # Delete old image if exists
        if old_filename:
            self.delete_image(user_type, old_filename)
        
        # Save file
        try:
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            print(f"✅ File saved successfully: {len(content)} bytes")
            
            # Resize and optimize image
            self.resize_image(file_path)
            
            return filename
            
        except Exception as e:
            print(f"❌ Error saving file: {e}")
            # Clean up file if save failed
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=500, detail=f"Error saving image: {str(e)}")
    
    def delete_image(self, user_type: str, filename: str) -> None:
        """Delete image file"""
        if not filename:
            return
            
        type_mapping = {
            'patient': self.patient_dir,
            'therapist': self.therapist_dir,
            'clinic': self.clinic_dir
        }
        
        upload_dir = type_mapping.get(user_type)
        if not upload_dir:
            return
        
        file_path = os.path.join(upload_dir, filename)
        
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass  # Ignore deletion errors
    
    def get_image_url(self, user_type: str, filename: Optional[str]) -> Optional[str]:
        """Get full URL for image"""
        if not filename:
            return None
        
        # Map user types to directory names
        type_mapping = {
            'patient': 'patients',
            'therapist': 'therapists', 
            'clinic': 'clinics'
        }
        
        dir_name = type_mapping.get(user_type, f"{user_type}s")
        return f"/static/uploads/{dir_name}/{filename}"

# Singleton instance
image_service = ImageService()