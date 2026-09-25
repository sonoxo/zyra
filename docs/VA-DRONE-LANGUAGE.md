# VA Drone Language

VA (Virginia runtime language) now includes a governed drone instruction family that compiles into the existing ZYRA MAVSDK/SITL control path.

## Architecture

```text
Human / GPT-Doug-LLM
        |
        v
VA mission text
        |
        v
Virginia parser
        |
        v
ZYRA policy / approval gate
        |
        +--> simulation / PX4 / Gazebo / SITL
        |
        +--> explicitly approved hardware
        |
        v
MAVSDK -> MAVLink -> autopilot
        |
        v
telemetry + audit evidence
```

## Core instructions

```text
DRONE MODE SIMULATION
DRONE CONNECT
DRONE READY
DRONE TELEMETRY
DRONE TAKEOFF 12
DRONE WAIT 5
DRONE RTL
DRONE LAND
DRONE BEHAVIOR orbit {"radiusM":20,"speedMps":4}
```

The TypeScript VA parser accepts named `DRONE BEHAVIOR` instructions so the language can grow without changing its top-level grammar. The Java MAVSDK runtime intentionally refuses unregistered behaviors. Add each behavior as a reviewed handler with explicit preconditions, bounds, telemetry checks and an emergency fallback.

## Run a mission in SITL

From `zyra-uav-sitl/`:

```bash
mvn -q exec:java \
  -Dexec.mainClass=com.sonoxo.zyra.uav.sitl.VirginiaDroneCli \
  -Dexec.args="examples/basic-flight.va"
```

Expected environment defaults remain compatible with the existing ZYRA SITL module:

```text
ZYRA_MAVSDK_HOST=127.0.0.1
ZYRA_MAVSDK_PORT=50051
ZYRA_TAKEOFF_ALT=10
ZYRA_DRONE_MAX_ALT_M=120
```

## Hardware gate

`DRONE MODE HARDWARE` fails closed unless both variables are explicitly set:

```text
ZYRA_DRONE_HARDWARE_ALLOWED=true
ZYRA_OPERATOR_APPROVED=true
```

This gate is independent from capability: it does not make an airframe, location, mission or operation authorized by itself.

## Language design

VA drone instructions are intentionally declarative. The language describes intent while ZYRA owns permission, bounds, execution and audit.

Recommended future behavior handlers:

- `hover`
- `orbit`
- `survey_grid`
- `follow_route`
- `formation`
- `inspect_asset`
- `return_on_low_battery`
- `land_on_link_loss`

Every handler should provide: argument schema, preconditions, geofence/bounds, timeout, abort path, telemetry evidence and simulation tests.
