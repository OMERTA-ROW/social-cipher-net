# Space imagery attribution

All astronomical imagery used by the solar-system view is NASA-derived,
public domain, or CC BY 4.0. No image is generated or fabricated.

Voyage planets use these maps directly as spherical surface imagery. Its asteroid
regolith maps are deterministic procedural materials created in-app and are not
NASA imagery; they are intentionally identified separately here to avoid false
source attribution.

| Asset | Subject | Source | Licence |
| --- | --- | --- | --- |
| `stars_8k.jpg`, `stars_milky_way.jpg` | All-sky Milky Way survey mosaic (equirectangular) | Solar System Scope texture set, derived from ESO / NASA all-sky imagery | CC BY 4.0 |
| `sun.jpg` | Solar photosphere | NASA SDO / Solar System Scope | Public domain / CC BY 4.0 |
| `mercury.jpg` | Mercury surface map | NASA MESSENGER / USGS | Public domain |
| `venus_surface.jpg`, `venus_atmosphere.jpg` | Venus surface and cloud deck | NASA Magellan / Solar System Scope | Public domain / CC BY 4.0 |
| `earth_daymap.jpg`, `earth_clouds.jpg` | Earth day map and cloud layer | NASA Visible Earth (Blue Marble) | Public domain |
| `moon.jpg` | Lunar surface | NASA LRO / USGS | Public domain |
| `mars.jpg` | Mars surface | NASA Viking / MGS MOLA | Public domain |
| `jupiter.jpg` | Jupiter cloud bands | NASA Cassini / Juno | Public domain |
| `saturn.jpg`, `saturn_ring.png` | Saturn globe and ring system | NASA Cassini | Public domain |
| `uranus.jpg`, `neptune.jpg` | Ice giants | NASA Voyager 2 | Public domain |
| `nebula_orion.jpg` | Orion Nebula (M42) | NASA / ESA Hubble | Public domain |
| `nebula_carina.jpg` | Carina Nebula "Cosmic Cliffs" | NASA / ESA / CSA JWST | Public domain |
| `nebula_eagle.jpg` | Eagle Nebula "Pillars of Creation" | NASA / ESA Hubble | Public domain |
| `nebula_horsehead.jpg` | Horsehead Nebula (B33) | NASA / ESA Hubble | Public domain |
| In-app procedural asteroid regolith | Asteroid albedo/bump variation and crater relief | Generated locally by CyberLink Social; no external image source | Project code |

Files are stored as CDN asset pointers under `src/assets/space/` and are
loaded lazily after first paint (`useLazyTexture`), with the low-resolution
sky mosaic used on reduced-detail devices.
