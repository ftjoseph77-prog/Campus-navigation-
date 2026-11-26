AJIET Campus Navigator
======================
A mobile-friendly campus map with shortest-route finder and an AR (camera + compass) arrow.

FILES
index.html          Home page: choose From / To, see the route on the map and step list
style.css           Styles for both pages
script.js           Map drawing and route UI for index.html
campus-map.js       Campus data (places, paths, GPS origin) and routing code
ar-navigation.html  AR page: camera view with a direction arrow
ar-navigation.js    AR logic: GPS, compass, distance, next stop
README.txt          This file

PUT IT ON GITHUB PAGES
1. Unzip, then upload all files to the root of your repository (main branch).
2. Settings > Pages > Deploy from a branch > main > / (root) > Save.
3. Open https://<username>.github.io/<repo>/ after 1-2 minutes.
   AR needs HTTPS (GitHub Pages is HTTPS) and the visitor must allow camera, location and motion.

MAKE IT ACCURATE (important)
The places and paths in campus-map.js are a SAMPLE.
1. Set CAMPUS.origin to the real GPS position of the Main Gate (lat, lon).
2. For each place set x (metres east of the gate) and y (metres north of the gate).
3. Edit CAMPUS.edges so they match the real walking paths.
