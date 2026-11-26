
const camera = document.getElementById("camera");
const overlay = document.getElementById("overlay");
const arrow = document.getElementById("arrow");

const destinationSelect =
document.getElementById("destination");

const statusText = document.getElementById("status");

const distanceText = document.getElementById("distance");
const directionText = document.getElementById("direction");
const destinationName =
document.getElementById("destinationName");

let cameraStream = null;
let gpsWatch = null;
let currentLocation = null;
let compassHeading = null;
let activeDestination = null;

function loadDestinations() {
  destinationSelect.innerHTML = "";

  CAMPUS_MAP.destinations.forEach(place => {
    const option = document.createElement("option");
    option.value = place.id;
    option.textContent = place.name;
    destinationSelect.appendChild(option);
  });
}

function distanceBetween(lat1, lon1, lat2, lon2) {
  const R = 6371000;

  const toRad = x => x * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = x => x * Math.PI / 180;
  const toDeg = x => x * 180 / Math.PI;

  const y =
    Math.sin(toRad(lon2 - lon1)) *
    Math.cos(toRad(lat2));

  const x =
    Math.cos(toRad(lat1)) *
    Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.cos(toRad(lon2 - lon1));

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function getDirection(degrees) {
  const directions = [
    "North", "North-East", "East", "South-East",
    "South", "South-West", "West", "North-West"
  ];

  return directions[Math.round(degrees / 45) % 8];
}

function updateNavigation() {
  if (!currentLocation || !activeDestination) return;

  const distance = distanceBetween(
    currentLocation.lat,
    currentLocation.lng,
    activeDestination.lat,
    activeDestination.lng
  );

  const bearing = calculateBearing(
    currentLocation.lat,
    currentLocation.lng,
    activeDestination.lat,
    activeDestination.lng
  );

  distanceText.textContent =
    "Distance: " + Math.round(distance) + " metres";

  directionText.textContent =
    "Direction: " + getDirection(bearing);

  destinationName.textContent = activeDestination.name;

  if (distance < 10) {
    statusText.textContent = "You have reached your destination!";
  } else if (compassHeading === null) {
    statusText.textContent =
      "GPS active. Waiting for compass direction.";
  } else {
    const relative =
      ((bearing - compassHeading + 540) % 360) - 180;

    arrow.style.transform =
      `translate(-50%, -50%) rotate(${relative}deg)`;

    statusText.textContent =
      "Follow the arrow to reach your destination.";
  }
}

function handleGPS(position) {
  currentLocation = {
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };

  updateNavigation();
}

function handleCompass(event) {
  let heading = null;

  if (typeof event.webkitCompassHeading === "number") {
    heading = event.webkitCompassHeading;
  } else if (typeof event.alpha === "number") {
    heading = (360 - event.alpha) % 360;
  }

  if (heading !== null) {
    compassHeading = heading;
    updateNavigation();
  }
}

async function startNavigation() {
  activeDestination = CAMPUS_MAP.destinations.find(
    place => place.id === destinationSelect.value
  );

  if (!activeDestination ||
      !Number.isFinite(activeDestination.lat) ||
      !Number.isFinite(activeDestination.lng)) {
    statusText.textContent =
      "Please add valid campus coordinates in campus-map.js.";
    return;
  }

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera requires HTTPS and browser support.");
    }

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });

    camera.srcObject = cameraStream;
    camera.style.display = "block";
    overlay.style.display = "block";

    if (!navigator.geolocation) {
      throw new Error("GPS is not supported by this browser.");
    }

    gpsWatch = navigator.geolocation.watchPosition(
      handleGPS,
      error => {
        statusText.textContent =
          "Location error: " + error.message;
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000
      }
    );

    if (window.DeviceOrientationEvent?.requestPermission) {
      const permission =
        await DeviceOrientationEvent.requestPermission();

      if (permission === "granted") {
        window.addEventListener(
          "deviceorientation",
          handleCompass
        );
      }
    } else {
      window.addEventListener(
        "deviceorientation",
        handleCompass
      );
    }

    statusText.textContent =
      "AR camera started. Waiting for GPS location.";

  } catch (error) {
    statusText.textContent = error.message;
    stopNavigation();
  }
}

function stopNavigation() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }

  if (gpsWatch !== null) {
    navigator.geolocation.clearWatch(gpsWatch);
    gpsWatch = null;
  }

  window.removeEventListener(
    "deviceorientation",
    handleCompass
  );

  camera.srcObject = null;
  camera.style.display = "none";
  overlay.style.display = "none";

  currentLocation = null;
  compassHeading = null;
  activeDestination = null;

  statusText.textContent = "Navigation stopped.";
}

document.getElementById("startButton")
  .addEventListener("click", startNavigation);

document.getElementById("stopButton")
  .addEventListener("click", stopNavigation);

loadDestinations();
