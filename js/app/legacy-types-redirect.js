import { legacyTypePageUrl } from "./types-route.js";

const destination = legacyTypePageUrl(window.location.href);
if (destination) window.location.replace(destination.href);
