import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'mock-db.json');

export interface MockUser {
  id: string;
  email: string;
  password?: string;
  full_name?: string | null;
  document?: string | null;
  phone?: string | null;
  role: string;
  clinic_name?: string | null;
  created_at: string;
}

export interface MockClinic {
  id: string;
  name: string;
  legal_name: string | null;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface MockLoanApplication {
  id: string;
  patient_id: string;
  clinic_id: string | null;
  requested_amount: number;
  down_payment: number;
  installments: number;
  monthly_payment: number;
  interest_rate: number;
  total_cost: number;
  purpose: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  clinics?: { name: string };
  profiles?: { full_name: string };
}

export interface MockAffiliation {
  user_id: string;
  clinic_id: string;
  role: string;
}

export interface MockDB {
  users: MockUser[];
  clinics: MockClinic[];
  loans: MockLoanApplication[];
  affiliations: MockAffiliation[];
}

const defaultDB: MockDB = {
  users: [
    {
      id: "mock-admin",
      email: "admin@test.com",
      password: "password123",
      full_name: "Admin User",
      role: "admin",
      created_at: new Date().toISOString()
    },
    {
      id: "mock-patient",
      email: "patient@test.com",
      password: "password123",
      full_name: "Patient User",
      role: "patient",
      created_at: new Date().toISOString()
    },
    {
      id: "mock-clinic-user",
      email: "clinic@test.com",
      password: "password123",
      full_name: "Clinic Owner",
      role: "clinic",
      created_at: new Date().toISOString()
    }
  ],
  clinics: [
    {
      id: "mock-clinic-1",
      name: "Clínica Ortopédica Mock",
      legal_name: "Mock Orto LTDA",
      document: "11.111.111/0001-11",
      phone: "11999999999",
      email: "contato@ortomock.com",
      address: "Rua Falsa 123",
      city: "São Paulo",
      state: "SP",
      zip_code: "01000-000",
      status: "approved",
      created_at: new Date().toISOString()
    }
  ],
  loans: [
    {
      id: "mock-loan-1",
      patient_id: "mock-patient",
      clinic_id: "mock-clinic-1",
      requested_amount: 10000,
      down_payment: 2000,
      installments: 12,
      monthly_payment: 750,
      interest_rate: 1.5,
      total_cost: 11000,
      purpose: "Prótese de perna",
      status: "pending",
      notes: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: new Date().toISOString()
    }
  ],
  affiliations: [
    {
      user_id: "mock-clinic-user",
      clinic_id: "mock-clinic-1",
      role: "owner"
    }
  ]
};

export function getDB(): MockDB {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(data) as MockDB;
    }
  } catch (err) {
    console.error("Error reading mock DB:", err);
  }
  
  saveDB(defaultDB);
  return defaultDB;
}

export function saveDB(data: MockDB) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing mock DB:", err);
  }
}
