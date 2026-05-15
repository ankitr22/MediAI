"""
Upload PDFs to EC2 using paramiko (pure Python SSH/SCP).
Run: python scripts/upload_pdfs.py
"""
import subprocess
import sys
import os

KEY = r"C:\path\to\your-key.pem"   # update with your key path
HOST = "YOUR_EC2_PUBLIC_IP"          # update with your EC2 IP
USER = "ubuntu"
REMOTE_DIR = "/home/ubuntu/MediAI/backend"

PDFS = [
    r"C:\Users\Ankit\Downloads\GaleMedicineV1AB.pdf",
    r"C:\Users\Ankit\Downloads\GaleMedicineV2CF.pdf",
]

for pdf in PDFS:
    size = os.path.getsize(pdf)
    name = os.path.basename(pdf)
    print(f"Uploading {name} ({size/1024/1024:.1f} MB)...")
    
    result = subprocess.run([
        "scp",
        "-i", KEY,
        "-o", "StrictHostKeyChecking=no",
        "-o", "ConnectTimeout=60",
        pdf,
        f"{USER}@{HOST}:{REMOTE_DIR}/{name}"
    ], capture_output=False, timeout=300)
    
    if result.returncode == 0:
        print(f"  OK: {name} uploaded")
    else:
        print(f"  FAILED: {name} (exit {result.returncode})")
        sys.exit(1)

print("\nAll PDFs uploaded successfully!")
