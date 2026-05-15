import socket
import pymysql
import os

host = os.getenv("MYSQL_HOST", "db")
port = int(os.getenv("MYSQL_PORT", "3306"))
user = os.getenv("MYSQL_USER", "root")
password = os.getenv("MYSQL_PASSWORD", "your_password_here")
database = os.getenv("MYSQL_DATABASE", "medical_app")

print(f"Testing TCP to {host}:{port}...")
s = socket.socket()
s.settimeout(5)
result = s.connect_ex((host, port))
s.close()
print(f"TCP result: {result} (0=open)")

print(f"Testing pymysql connection...")
try:
    conn = pymysql.connect(host=host, port=port, user=user, password=password, database=database)
    conn.close()
    print("pymysql: SUCCESS")
except Exception as e:
    print(f"pymysql: FAILED - {e}")
