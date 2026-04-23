from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    patients = relationship("Patient", back_populates="doctor")

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    age = Column(Integer)
    gender = Column(String(20))
    contact = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    doctor = relationship("User", back_populates="patients")
    records = relationship("MedicalRecord", back_populates="patient", cascade="all, delete")

class MedicalRecord(Base):
    __tablename__ = "medical_records"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    diagnosis = Column(String(500))
    symptoms = Column(Text)
    treatment = Column(Text)
    notes = Column(Text)
    visit_date = Column(DateTime, default=datetime.utcnow)
    patient = relationship("Patient", back_populates="records")
