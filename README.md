# PHESTY | Minimalist Photography Portfolio & Admin Suite

![License](https://img.shields.io/badge/license-MIT-green)
![Tech](https://img.shields.io/badge/stack-Vanilla%20JS%20%2B%20Supabase-black)

**Phestone's** high-end photography portfolio designed for speed, aesthetic, and silent interaction. This project features a custom-built gallery system and a private admin dashboard for real-time content management.

## 📸 Core Features

* **Glassmorphism UI:** A modern, frosted-glass aesthetic across the landing page and modals.
* **Silent Interaction:** A "Double-Tap to Like" system with a flying heart animation—likes are tracked privately in the database.
* **Dynamic Stacks:** Categories (Street, Nature, Portrait) that automatically shuffle preview images from the database.
* **Follower System:** A custom "Join the Journey" prompt that collects fan names for future notifications.
* **Admin Control Center:**
    * **Secure Login:** Private entry for content management.
    * **Batch Upload:** Upload up to 5 photos at once with category tagging.
    * **Insights:** View total like counts and a scrollable list of recent followers.
    * **Record Destruction:** Cleanly delete photos from both the database and cloud storage.

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3 (Custom Glassmorphism), Vanilla JavaScript.
* **Backend/Database:** [Supabase](https://supabase.com/) (PostgreSQL & Storage).
* **Icons/Animations:** CSS Keyframes & Emoji-based interactions.

## 🚀 Deployment

This site is optimized for **GitHub Pages**.

1.  Clone the repository.
2.  Set up a Supabase project with `photos` and `followers` tables.
3.  Update the `SUPABASE_URL` and `SUPABASE_KEY` in `script.js` and `admin.js`.
4.  Push to the `main` branch and enable GitHub Pages in settings.

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

---
*Captured by Phestone*