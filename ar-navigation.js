/* AR Campus Navigation
 * Uses browser camera, geolocation and device orientation.
 * Requires HTTPS or localhost. See campus-map.js for setup.
 */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const els = {
    video: $("camera"), placeholder: $("cameraPlaceholder"), hud: $("hud"),
    destination: $("destination"), start: $("startButton"), stop: $("stopButton"),
    status: $("status"), gpsChip: $("gpsChip"), compassChip: $("compassChip"),
    arrow: $("directionArrow"), target: $("targetName"), instruction: $("instruction"),
    distance: $("distance"), bearing: $("bearing"), accuracy: $("accuracy")
  };

  let stream = null;
  let watchId = null;
  let orientationHandler = null;
  let currentPosition = null;
  let heading = null;
  let activeDestination = null;
  let routeIndex = 0;
  let running = false;

  const mapConfig = window.CAMPUS_MAP || { destinations: [] };
  const destinations = Array.isArray(mapConfig.destinations) ? mapConfig.destinations : [];

  function setStatus(message) { els.status.textContent = message; }

  function validCoordinate(point) {
    return point && Number.isFinite(point.lat) && Number.isFinite(point.lng)
      && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
  }

  function populateDestinations() {
    els.destination.innerHTML = "";
    destinations.forEach((place) => {
      const option = document.createElement("option");
      option.value = place.id;
      option.textContent = place.name;
      els.destination.appendChild(option);
    });
    if (!destinations.length) {
      const option = document.createElement("option");
      option.textContent = "No destinations configured";
      option.value = "";
      els.destination.appendChild(option);
      els.start.disabled = true;
    }
  }

  function getSelectedDestination() {
    return destinations.find((place) => place.id === els.destination.value) || null;
  }

  function toRadians(deg) { return deg * Math.PI / 180; }
  function toDegrees(rad) { return rad * 180 / Math.PI; }

  function distanceMeters(a, b) {
    const earthRadius = 6371000;
    const dLat = toRadians(b.lat - a.lat);
    const dLng = toRadians(b.lng - a.lng);
    const lat1 = toRadians(a.lat), lat2 = toRadians(b.lat);
    const h = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * earthRadius * Math.asin(Math.sqrt(h));
  }

  function bearingDegrees(a, b) {
    const lat1 = toRadians(a.lat), lat2 = toRadians(b.lat);
    const dLng = toRadians(b.lng - a.lng);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2)
      - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (toDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  function compassDirection(degrees) {
    return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
      Math.round(degrees / 45) % 8
    ];
  }

  function getNextRoutePoint() {
    if (!activeDestination) return null;
    const route = Array.isArray(activeDestination.route) ? activeDestination.route : [];
    while (routeIndex < route.length && currentPosition &&
      distanceMeters(currentPosition, route[routeIndex]) < 12) {
      routeIndex += 1;
    }
    return route[routeIndex] || activeDestination;
  }

  function updateNavigation() {
    if (!currentPosition || !activeDestination) return;
    const target = getNextRoutePoint();
    if (!validCoordinate(target)) {
      setStatus("Destination coordinates are missing. Edit campus-map.js and add valid latitude/longitude values.");
      els.instruction.textContent = "Campus map setup required";
      return;
    }

    const distanceToTarget = distanceMeters(currentPosition, target);
    const targetBearing = bearingDegrees(currentPosition, target);
    els.distance.textContent = distanceToTarget < 1000
      ? `${Math.round(distanceToTarget)} m`
      : `${(distanceToTarget / 1000).toFixed(2)} km`;
    els.bearing.textContent = `${compassDirection(targetBearing)} ${Math.round(targetBearing)}°`;
    els.accuracy.textContent = `±${Math.round(currentPosition.accuracy || 0)} m`;
    els.target.textContent = activeDestination.name;

    if (distanceToTarget < 10 && routeIndex >= (activeDestination.route || []).length) {
      els.instruction.textContent = "You have reached the destination.";
    } else if (heading === null) {
      els.instruction.textContent = `Head ${compassDirection(targetBearing)}. Waiting for compass heading…`;
    } else {
      const relative = ((targetBearing - heading + 540) % 360) - 180;
      els.arrow.style.transform = `rotate(${relative}deg)`;
      els.instruction.textContent = `${Math.round(distanceToTarget)} m to next point · ${compassDirection(targetBearing)}`;
    }
  }

  function handlePosition(position) {
    currentPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy
    };
    els.gpsChip.textContent = `GPS: ±${Math.round(currentPosition.accuracy)} m`;
    updateNavigation();
  }

  function handlePositionError(error) {
    const messages = {
      1: "Location permission was denied. Allow location access in browser settings.",
      2: "Your location is currently unavailable. Try outdoors or check device location.",
      3: "Getting your location timed out. Try again."
    };
    setStatus(messages[error.code] || "Unable to get your location.");
    els.gpsChip.textContent = "GPS: unavailable";
  }

  function handleOrientation(event) {
    let value = null;
    if (typeof event.webkitCompassHeading === "number") {
      value = event.webkitCompassHeading;
    } else if (typeof event.alpha === "number") {
      // Absolute orientation alpha is a fallback; device/browser implementations vary.
      value = (360 - event.alpha) % 360;
      if (screen.orientation && typeof screen.orientation.angle === "number") {
        value = (value + screen.orientation.angle) % 360;
      }
    }
    if (Number.isFinite(value)) {
      heading = (value + 360) % 360;
      els.compassChip.textContent = `Compass: ${Math.round(heading)}° ${compassDirection(heading)}`;
      updateNavigation();
    } else {
      els.compassChip.textContent = "Compass: unavailable";
    }
  }

  async function requestOrientationPermission() {
    const Orientation = window.DeviceOrientationEvent;
    if (Orientation && typeof Orientation.requestPermission === "function") {
      const permission = await Orientation.requestPermission();
      if (permission !== "granted") throw new Error("Motion/orientation permission was not granted.");
    }
    if (!Orientation) throw new Error("This browser does not provide device orientation.");
    orientationHandler = handleOrientation;
    window.addEventListener("deviceorientationabsolute", orientationHandler, true);
    window.addEventListener("deviceorientation", orientationHandler, true);
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera is not available. Open the site over HTTPS in a supported browser.");
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    els.video.srcObject = stream;
    els.video.style.display = "block";
    els.placeholder.style.display = "none";
    els.hud.style.display = "block";
  }

  async function startNavigation() {
    activeDestination = getSelectedDestination();
    routeIndex = 0;
    if (!activeDestination) {
      setStatus("Choose a destination first.");
      return;
    }
    if (!validCoordinate(activeDestination)) {
      setStatus(`"${activeDestination.name}" has no valid coordinates. Add lat and lng in campus-map.js first.`);
      return;
    }
    if (!navigator.geolocation) {
      setStatus("Geolocation is not supported by this browser.");
      return;
    }

    els.start.disabled = true;
    try {
      await startCamera();
      try {
        await requestOrientationPermission();
      } catch (orientationError) {
        els.compassChip.textContent = "Compass: permission needed";
        setStatus(`${orientationError.message} GPS navigation can still show distance and bearing.`);
      }
      watchId = navigator.geolocation.watchPosition(handlePosition, handlePositionError, {
        enableHighAccuracy: true, maximumAge: 1000, timeout: 15000
      });
      running = true;
      els.stop.disabled = false;
      setStatus("Navigation started. Keep the phone steady and follow the arrow. GPS works best outdoors.");
    } catch (error) {
      stopNavigation();
      setStatus(error.message || "Could not start navigation.");
    }
  }

  function stopNavigation() {
    running = false;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (orientationHandler) {
      window.removeEventListener("deviceorientationabsolute", orientationHandler, true);
      window.removeEventListener("deviceorientation", orientationHandler, true);
      orientationHandler = null;
    }
    els.video.pause();
    els.video.srcObject = null;
    els.video.style.display = "none";
    els.placeholder.style.display = "grid";
    els.hud.style.display = "none";
    els.start.disabled = !destinations.length;
    els.stop.disabled = true;
    els.distance.textContent = "—";
    els.bearing.textContent = "—";
    els.accuracy.textContent = "—";
    els.gpsChip.textContent = "GPS: waiting";
    els.compassChip.textContent = "Compass: waiting";
    heading = null;
    currentPosition = null;
    setStatus("Navigation stopped.");
  }

  els.start.addEventListener("click", startNavigation);
  els.stop.addEventListener("click", stopNavigation);
  els.destination.addEventListener("change", () => {
    activeDestination = getSelectedDestination();
    routeIndex = 0;
    if (running) setStatus("Destination changed. Updating guidance…");
    updateNavigation();
  });
  window.addEventListener("pagehide", stopNavigation);

  populateDestinations();
})();
