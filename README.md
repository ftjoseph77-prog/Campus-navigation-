# AJIET Campus Navigator

A beginner-friendly, mobile-responsive campus navigation website for A.J. Institute of Engineering & Technology, Mangaluru.

## Included
- Interactive OpenStreetMap map (Leaflet)
- Phone GPS location with browser permission
- Search and destination selector for campus places
- Walking route preview using the public OSRM demo routing service
- Optional Firebase Realtime Database live location sharing (OFF by default; user opt-in)
- Editable `locations.json` for verified buildings, classrooms, labs and floors

## Important accuracy note
The campus centre is an approximate public map coordinate. The individual room/building pins are intentionally blank placeholders. Do not treat them as real locations. Survey each entrance/room with a phone GPS or use an official campus map and enter verified coordinates in `locations.json`. Ordinary GPS is often inaccurate inside buildings. For indoor room-level navigation, add floor plans, QR checkpoints or a dedicated indoor positioning system.

## Run locally
You can open `index.html` through a local web server. For example, with Python installed:
```bash
python -m http.server 8000
```
Then open `http://localhost:8000`.

## Publish using GitHub Pages
1. Create a GitHub repository named `ajiet-campus-navigation`.
2. Upload all files in this folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then Save.
6. Open the GitHub Pages URL. GPS requires HTTPS; GitHub Pages provides HTTPS.

## Add verified campus places
Edit `locations.json`. Each place needs a unique `id`, readable `name`, `category`, `lat` and `lng`.
Example:
```json
{
  "id": "ece-room-101",
  "name": "ECE Room 101",
  "category": "Classroom",
  "lat": 12.90170,
  "lng": 74.99950,
  "floor": "First floor"
}
```
Replace those example coordinates with the exact verified position. Add more entries to the `places` array. For a room indoors, the map pin can only represent its approximate building position unless you implement indoor mapping.

## Enable opt-in live location sharing (Firebase)
Live sharing across different phones needs a shared backend. GitHub Pages alone cannot store and relay live positions.
1. Create a Firebase project at https://console.firebase.google.com/
2. Add a Web App and enable **Realtime Database**.
3. Copy the Firebase web configuration into `firebase-config.js` as `window.FIREBASE_CONFIG = { ... }`.
4. Configure Firebase Authentication and strict Realtime Database Security Rules before real student use. Do not deploy public read/write rules.
5. Decide who is allowed to see locations. This starter shows connected opt-in users to other connected users; it does not include student identity/login or role-based access yet.
6. Test with two phones. Each phone must grant location permission and switch on sharing. Turn it off to stop sharing.

**Privacy:** Do not track students without their informed consent. For a college-wide rollout, ask the college to approve the system, add authenticated accounts, restrict visibility to authorized users, minimize retention, and publish a clear privacy notice.

## Services and attribution
- Map tiles: OpenStreetMap contributors (attribution is shown on the map).
- Walking routes: public OSRM demo endpoint; subject to availability and usage policy. For production/high traffic, use a suitable routing provider.
- Leaflet: https://leafletjs.com/
