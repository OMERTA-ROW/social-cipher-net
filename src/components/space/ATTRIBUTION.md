# Space imagery attribution

Astronomical imagery used by the solar-system view comes from the credited
public-domain mission sources or the CC BY 4.0 Solar System Scope texture set.
This is a curated visual integration, not a live NASA service or NASA-certified product.

Voyage planets use these maps directly as spherical surface imagery. Its asteroid
regolith maps are deterministic procedural materials created in-app and are not
NASA imagery; they are intentionally identified separately here to avoid false
source attribution.

The distant nebula frames are shown with restrained blending for scene depth;
their display is aesthetic rather than calibrated scientific color. The nearby
black-hole, wormhole, comet, pulsar, quasar, galaxy, nebula, and supernova detail
images are original project art used only to modulate spatial geometry and are
not presented as NASA imagery.

| Asset | Subject | Source | Licence |
| --- | --- | --- | --- |
| `stars_8k.jpg`, `stars_milky_way.jpg` | Equirectangular Milky Way sky texture | Solar System Scope texture set; source notes cite astronomical survey imagery | CC BY 4.0 |
| `sun.jpg` | Solar photosphere texture | Solar System Scope texture set, informed by solar-observatory imagery | CC BY 4.0 |
| `mercury.jpg` | Mercury surface map | NASA MESSENGER / USGS | Public domain |
| `venus_surface.jpg`, `venus_atmosphere.jpg` | Venus surface and cloud deck | NASA Magellan / Solar System Scope | Public domain / CC BY 4.0 |
| `earth_daymap.jpg`, `earth_clouds.jpg` | Earth day map and cloud layer | NASA Visible Earth (Blue Marble) | Public domain |
| `moon.jpg` | Lunar surface | NASA LRO / USGS | Public domain |
| `mars.jpg` | Mars surface | NASA Viking / MGS MOLA | Public domain |
| `jupiter.jpg` | Jupiter cloud-band map | Solar System Scope texture set, based on mission imagery including Cassini/Juno | CC BY 4.0 |
| `saturn.jpg`, `saturn_ring.png` | Saturn globe and ring maps | Solar System Scope texture set, based on Cassini imagery | CC BY 4.0 |
| `uranus.jpg`, `neptune.jpg` | Ice-giant maps | Solar System Scope texture set, based on Voyager 2 imagery | CC BY 4.0 |
| `nebula_orion.jpg` | Orion Nebula (M42) | NASA / ESA Hubble | Public domain |
| `nebula_carina.jpg` | Carina Nebula "Cosmic Cliffs" | NASA / ESA / CSA JWST | Public domain |
| `nebula_eagle.jpg` | Eagle Nebula "Pillars of Creation" | NASA / ESA Hubble | Public domain |
| `nebula_horsehead.jpg` | Horsehead Nebula (B33) | NASA / ESA Hubble | Public domain |
| In-app procedural asteroid regolith | Asteroid albedo/bump variation and crater relief | Generated locally by CyberLink Social; no external image source | Project code |

Files are stored as CDN asset pointers under `src/assets/space/` and are
loaded lazily after first paint (`useLazyTexture`), with the low-resolution
sky mosaic used on reduced-detail devices.
