# PropManager Pro

**The only property management app built for investor-landlords.**

Built by Linda Rodriguez · Powered by Next.js + Supabase

---

## 🚀 Quick Setup (5 steps)

### 1. Install Node.js
Download from **nodejs.org** → install the LTS version

### 2. Upload to GitHub
- Go to **github.com** → New repository → name it `propmanager-pro`
- Upload all these files (drag and drop the folder)

### 3. Connect to Vercel
- Go to **vercel.com**
- Click "Add New Project" → Import your GitHub repo
- Add Environment Variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL = https://sugfedlfmvmbcnblhnuc.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_h3XsDU5Y8DgjlGdCYBxezw_Tx17iPL
  ```
- Click Deploy!

### 4. Your app is live! 🎉
Vercel gives you a URL like `propmanager-pro.vercel.app`

### 5. Custom Domain (optional)
Buy `propmanagerpro.com` at namecheap.com (~$12/yr) and connect in Vercel settings

---

## 📁 Project Structure

```
propmanager-pro/
├── app/                    ← All pages
│   ├── dashboard/          ← Main dashboard (reads from Supabase)
│   ├── properties/         ← Your 4 real properties
│   ├── tenants/            ← Tenant management
│   ├── payments/           ← Rent collection
│   ├── messages/           ← Tenant messaging
│   └── ...                 ← All other modules
├── components/
│   ├── Sidebar.tsx         ← Navigation
│   └── AppShell.tsx        ← Page wrapper
├── lib/
│   └── supabase.ts         ← Database connection + helpers
└── .env.local              ← Your API keys (never share this file!)
```

---

## 🔑 Your Credentials (KEEP PRIVATE)

```
Supabase Project:  propmanager-pro
Supabase URL:      https://sugfedlfmvmbcnblhnuc.supabase.co
User ID:           cacb3a74-75d7-4e07-af71-6db4fdde9a92
```

---

## 🏠 Your Properties in the Database

1. 1842 Magnolia Blvd — Orlando FL 32803 (Single Family · Occupied · Self)
2. 374 Citrus Ave #2B — Orlando FL 32801 (Condo · Occupied · Self)
3. 9901 Lakeside Dr — Kissimmee FL 34741 (Single Family · Occupied · LLC - PropCo)
4. 2201 Pine Street — Sanford FL 32771 (Duplex · Vacant · LLC - PropCo)

---

## 🛠 Next Steps (Future Sessions)

- [ ] Add tenants + leases to database
- [ ] Connect Stripe for real rent payments
- [ ] Wire remaining pages (income, mortgage, tax, market)
- [ ] TransUnion API for tenant screening
- [ ] DocuSign for e-signatures
- [ ] Deploy to propmanagerpro.com

---

## 💡 Tech Stack

- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Theme:** Modern Slate (Syne + Plus Jakarta Sans)
- **Payments (future):** Stripe Connect
- **Screening (future):** TransUnion SmartMove

---

Built with ❤️ in Orlando, FL
