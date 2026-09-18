package com.sonoxo.zyra.uav.sitl;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;

/**
 * Minimal VA/Virginia drone runtime.
 *
 * Usage:
 *   mvn -q exec:java -Dexec.mainClass=com.sonoxo.zyra.uav.sitl.VirginiaDroneCli \
 *     -Dexec.args="mission.va"
 *
 * Safe defaults:
 * - SIMULATION is the default/expected mode.
 * - HARDWARE requires ZYRA_DRONE_HARDWARE_ALLOWED=true and ZYRA_OPERATOR_APPROVED=true.
 * - Takeoff altitude is bounded by ZYRA_DRONE_MAX_ALT_M (default 120m).
 */
public final class VirginiaDroneCli {

    private enum Mode { SIMULATION, HARDWARE }

    private final ZyraSitlController drone;
    private Mode mode = Mode.SIMULATION;
    private boolean connected;
    private final double maxAltitudeM;

    private VirginiaDroneCli() {
        this.drone = new ZyraSitlController(SitlConfig.load());
        this.maxAltitudeM = Double.parseDouble(
                System.getenv().getOrDefault("ZYRA_DRONE_MAX_ALT_M", "120")
        );
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            throw new IllegalArgumentException("Usage: VirginiaDroneCli <mission.va>");
        }
        new VirginiaDroneCli().run(Path.of(args[0]));
    }

    private void run(Path missionPath) throws Exception {
        List<String> lines = Files.readAllLines(missionPath);

        System.out.println("======================================");
        System.out.println(" VA / VIRGINIA DRONE RUNTIME");
        System.out.println("======================================");

        for (String raw : lines) {
            String line = raw.trim();
            if (line.isEmpty() || line.startsWith("#") || line.equalsIgnoreCase("VIRGINIA")) {
                continue;
            }
            execute(line);
        }
    }

    private void execute(String line) throws Exception {
        String upper = line.toUpperCase();

        if (upper.startsWith("DRONE MODE ")) {
            Mode requested = Mode.valueOf(upper.substring("DRONE MODE ".length()).trim());
            if (requested == Mode.HARDWARE) requireHardwareApproval();
            mode = requested;
            System.out.println("[VA-DRONE] mode=" + mode);
            return;
        }

        if (upper.equals("DRONE CONNECT")) {
            drone.waitForConnection();
            connected = true;
            System.out.println("[VA-DRONE] connected=true");
            return;
        }

        requireConnected();

        if (upper.equals("DRONE READY")) {
            drone.waitForHealth();
            System.out.println("[VA-DRONE] ready=true");
            return;
        }

        if (upper.equals("DRONE TELEMETRY")) {
            drone.printTelemetry();
            System.out.println("[VA-DRONE] telemetry-stream=enabled");
            return;
        }

        if (upper.startsWith("DRONE TAKEOFF ")) {
            double altitudeM = Double.parseDouble(line.substring("DRONE TAKEOFF ".length()).trim());
            if (altitudeM <= 0 || altitudeM > maxAltitudeM) {
                throw new IllegalArgumentException(
                        "Takeoff altitude must be > 0 and <= " + maxAltitudeM + "m"
                );
            }
            drone.setTakeoffAltitude(altitudeM);
            drone.arm();
            drone.takeoff();
            System.out.println("[VA-DRONE] airborne altitude-target-m=" + altitudeM);
            return;
        }

        if (upper.startsWith("DRONE WAIT ")) {
            double seconds = Double.parseDouble(line.substring("DRONE WAIT ".length()).trim());
            if (seconds < 0 || seconds > 3600) {
                throw new IllegalArgumentException("DRONE WAIT must be between 0 and 3600 seconds");
            }
            Thread.sleep(Duration.ofMillis((long) (seconds * 1000)).toMillis());
            return;
        }

        if (upper.equals("DRONE RTL")) {
            drone.returnToLaunch();
            return;
        }

        if (upper.equals("DRONE LAND")) {
            drone.land();
            return;
        }

        if (upper.startsWith("DRONE BEHAVIOR ")) {
            throw new UnsupportedOperationException(
                    "Named behaviors compile in VA but require a registered, reviewed behavior handler: " + line
            );
        }

        throw new IllegalArgumentException("Unknown VA drone instruction: " + line);
    }

    private void requireConnected() {
        if (!connected) {
            throw new IllegalStateException("DRONE CONNECT must run before flight instructions");
        }
    }

    private void requireHardwareApproval() {
        boolean hardwareAllowed = Boolean.parseBoolean(
                System.getenv().getOrDefault("ZYRA_DRONE_HARDWARE_ALLOWED", "false")
        );
        boolean operatorApproved = Boolean.parseBoolean(
                System.getenv().getOrDefault("ZYRA_OPERATOR_APPROVED", "false")
        );
        if (!hardwareAllowed || !operatorApproved) {
            throw new IllegalStateException(
                    "HARDWARE mode denied: set both ZYRA_DRONE_HARDWARE_ALLOWED=true " +
                    "and ZYRA_OPERATOR_APPROVED=true after explicit operator review"
            );
        }
    }
}
