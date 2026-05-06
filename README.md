# 🚀 Founder Dashboard – Productivity & Goal Management System

A full-stack productivity dashboard designed to help users manage **projects, goals, and tasks** with real-time analytics, deadlines, and smart prioritization.

Built as a scalable SaaS-style application with structured data relationships and interactive insights.

---

## ✨ Features

### 📁 Project → Goal → Task Hierarchy

* Organize work into **Projects → Goals → Tasks**
* Structured workflow similar to real-world productivity systems

### 📊 Analytics Dashboard

* Goal progress visualization
* Task completion insights
* Weekly productivity tracking
* Per-project analytics

### ⏰ Deadlines & Smart Alerts

* Task deadlines with visual indicators:

  * 🔴 Overdue
  * 🟠 Due soon
* Dashboard alerts for urgent tasks

### ⚡ Productivity Enhancements

* Keyboard shortcuts for fast navigation
* Urgency-based task sorting
* Quick task toggling and editing

### 🌙 Modern UI/UX

* Dark mode support
* Responsive layout
* Interactive cards and transitions
* Clean dashboard design

---

## 🧠 Tech Stack

**Frontend**

* React (Vite)
* React Router
* Recharts (data visualization)

**Backend / Database**

* Supabase (PostgreSQL + Auth)

**Deployment**

* Vercel

---

## 🔐 Authentication

* Supabase authentication
* Secure user-based data isolation using Row Level Security (RLS)

---

## 📂 Database Structure

```
Projects
  └── Goals
        └── Tasks
```

Each entity is securely linked via `user_id`.

---

## 📈 Key Highlights

* Built a **relational data-driven system** with real-time UI updates
* Implemented **derived analytics (progress, completion rates)**
* Designed a **scalable component architecture**
* Focused on **UX + performance + usability**

---

## 🚀 Live Demo

👉 [Add your Vercel link here]

---

## 📌 Future Improvements

* Notifications system
* Drag & drop task management
* Team collaboration features

---

## 🧑‍💻 Author

**Anurag Dharmik**
