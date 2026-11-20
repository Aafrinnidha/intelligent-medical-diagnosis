# Intelligent Medical Diagnosis and Clinical Decision Support System Using Knowledge Engineering

A full-stack Clinical Decision Support System (CDSS) built with **React.js, Tailwind CSS, Node.js, Express.js, and MongoDB Atlas**, implementing a structured **Medical Knowledge Base**, **IF-THEN Production Rules**, a **Forward-Chaining Rule-Based Inference Engine**, and an **Independent Real-Time Emergency Alert System**.

> **Clinical Disclaimer:** This system is designed strictly to assist doctors, not replace medical professionals. All diagnosis results are presented as suggestions requiring qualified doctor verification. Included medical rules are clearly marked as **educational demonstration data (non-clinical)**.

---

## Project Structure

```text
medical-cdss/
├── client/                     # React + Vite + Tailwind CSS frontend
│   └── src/
│       ├── components/         # Layout, ProtectedRoute, EmergencyAlertBanner, Modal
│       ├── context/            # AuthContext (JWT session & RBAC state)
│       ├── pages/              # Login, Register, Dashboard, Patients, NewDiagnosis,
│       │                       # DiagnosisResult, DiagnosisHistory, KnowledgeBase
│       ├── services/           # Axios API client
│       ├── styles/             # Tailwind & print CSS
│       ├── utils/              # Real-time emergency evaluator, PDF export, constants
│       ├── App.jsx
│       └── main.jsx
└── server/                     # Node.js + Express + Mongoose backend
    ├── config/                 # MongoDB Atlas connection & KB seeding
    ├── controllers/            # Auth, Dashboard, Patient, Symptom, TestResult,
    │                           # Emergency, KnowledgeBase, Diagnosis + PDFKit report
    ├── middleware/             # JWT auth, RBAC authorize, express-validator, errors
    ├── models/                 # Doctor, Patient, Disease, MedicalRule,
    │                           # Symptom, TestResult, Diagnosis
    ├── routes/                 # REST API routers
    ├── scripts/                # promoteExpert.js CLI utility
    ├── services/
    │   ├── inferenceEngine.js
    │   ├── knowledgeBaseService.js
    │   └── emergencyAlertService.js
    ├── tests/                  # Inference engine & emergency alert unit tests
    ├── app.js
    ├── .env.example
    └── .env
```

---

## Setup Instructions

### 1. Configure MongoDB Atlas (`server/.env`)
Copy `server/.env.example` to `server/.env` and set your **MongoDB Atlas** connection string:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/medical_cdss?retryWrites=true&w=majority
JWT_SECRET=your_long_random_secret_key
JWT_EXPIRES_IN=12h
CLIENT_URL=http://localhost:5173
EXPERT_REGISTRATION_CODE=CDSS-EXPERT-2026
```

### 2. Install Dependencies
```bash
cd server && npm install
cd ../client && npm install
```

### 3. Run the Application
Start the backend (automatically connects to MongoDB and seeds the educational Knowledge Base if empty):
```bash
cd server
npm run dev
```

Start the frontend:
```bash
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Role-Based Access Control (RBAC)
- **Doctor (`doctor`):** Full access to Patient Management, Symptom/Test Entry, Forward-Chaining Diagnosis, Diagnosis History, PDF Reports, Physician Verification. Medical rules are evaluated automatically in the background without cluttering the doctor's workflow.
- **Authorized Medical Expert / Admin (`medical_expert` / `admin`):** Access to Knowledge Base administration at `/admin/knowledge-base` (Add/Edit/Delete diseases and IF-THEN production rules).
  - Register with the `EXPERT_REGISTRATION_CODE` configured in `server/.env`, **or** promote any existing registered doctor via CLI:
    ```bash
    cd server
    npm run promote-expert -- doctor@hospital.org
    ```

---

## Free Cloud Deployment (Render from GitHub)

Because this is a full-stack application with a Node.js/Express inference engine and MongoDB Atlas database, deploy it as a Web Service on **Render** (free tier) connected directly to your GitHub repository:

### Step 1: Sign Up on Render
Go to [render.com](https://render.com) and sign in using your **GitHub account**.

### Step 2: Create a New Web Service
1. In the Render Dashboard, click **New +** -> **Web Service**.
2. Select **Build and deploy from a Git repository**.
3. Connect your repository: `Aafrinnidha/intelligent-medical-diagnosis`.

### Step 3: Configure Service Settings
- **Name**: `intelligent-medical-diagnosis` (or any name you prefer)
- **Region**: Nearest to your users (e.g., Singapore, Frankfurt, Oregon)
- **Branch**: `main`
- **Root Directory**: *(leave blank)*
- **Runtime**: `Node`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Instance Type**: `Free`

### Step 4: Add Environment Variables
Under the **Environment Variables** section, add:
- `NODE_ENV`: `production`
- `MONGODB_URI`: `mongodb+srv://<username>:<password>@<cluster-url>/medical_cdss?retryWrites=true&w=majority` *(Your MongoDB Atlas URI)*
- `JWT_SECRET`: *(A random 32+ character string, e.g. `medical_cdss_super_secure_jwt_secret_2026`)*
- `EXPERT_REGISTRATION_CODE`: `CDSS-EXPERT-2026`

### Step 5: Deploy
Click **Create Web Service**. Render will:
1. Clone your GitHub repository.
2. Run `npm run build` (installs backend & frontend dependencies, builds Vite React assets into `client/dist`).
3. Run `npm start` (starts the Node.js/Express server on the allocated port).
4. Automatically serve your frontend and API from your free URL (e.g., `https://intelligent-medical-diagnosis.onrender.com`).
5. Automatically redeploy whenever you push new commits to `main`!

---

## Running Automated Tests
```bash
cd server
npm test
```


---

## Running Automated Tests
```bash
cd server
npm test
```
https://intelligent-medical-diagnosis.vercel.app/login
