package com.sonoxo.zyra.uav;

public class SimulatedUav implements UavController {

    private UavState state =
            UavState.DISCONNECTED;

    private final GeoPoint home;

    private GeoPoint position;

    private double batteryPercent = 100.0;

    private double headingDegrees = 0.0;

    private double groundSpeedMps = 0.0;

    private final GeoFence geoFence;

    public SimulatedUav(
            GeoPoint home,
            GeoFence geoFence
    ) {
        this.home = home;
        this.position = home;
        this.geoFence = geoFence;
    }

    @Override
    public void connect() {

        requireState(
                UavState.DISCONNECTED
        );

        state = UavState.CONNECTED;

        log("CONNECTED");
    }

    @Override
    public void arm() {

        requireState(
                UavState.CONNECTED,
                UavState.LANDED
        );

        state = UavState.ARMED;

        log("ARMED");
    }

    @Override
    public void disarm() {

        if (state == UavState.FLYING) {
            throw new IllegalStateException(
                    "Cannot disarm while flying"
            );
        }

        state = UavState.CONNECTED;

        log("DISARMED");
    }

    @Override
    public void takeoff(
            double altitudeMeters
    ) {

        requireState(
                UavState.ARMED
        );

        GeoPoint target =
                new GeoPoint(
                        position.latitude(),
                        position.longitude(),
                        altitudeMeters
                );

        validate(target);

        state = UavState.FLYING;

        position = target;

        groundSpeedMps = 3.0;

        drainBattery(1.5);

        log(
                "TAKEOFF -> "
                + altitudeMeters
                + "m"
        );
    }

    @Override
    public void gotoPoint(
            GeoPoint point
    ) {

        requireState(
                UavState.FLYING
        );

        validate(point);

        groundSpeedMps = 8.0;

        headingDegrees =
                calculateHeading(
                        position,
                        point
                );

        position = point;

        drainBattery(2.0);

        log(
                "GOTO -> "
                + point
        );
    }

    @Override
    public void returnHome() {

        requireState(
                UavState.FLYING
        );

        state =
                UavState.RETURNING_HOME;

        position =
                new GeoPoint(
                        home.latitude(),
                        home.longitude(),
                        Math.max(
                                position.altitudeMeters(),
                                20
                        )
                );

        drainBattery(1.0);

        log("RETURNING HOME");

        land();
    }

    @Override
    public void land() {

        if (
                state != UavState.FLYING
                &&
                state != UavState.RETURNING_HOME
        ) {
            throw new IllegalStateException(
                    "UAV is not airborne"
            );
        }

        state =
                UavState.LANDING;

        position =
                new GeoPoint(
                        position.latitude(),
                        position.longitude(),
                        0
                );

        groundSpeedMps = 0;

        state =
                UavState.LANDED;

        drainBattery(0.5);

        log("LANDED");
    }

    @Override
    public void emergencyStop() {

        state =
                UavState.EMERGENCY_STOP;

        groundSpeedMps = 0;

        log(
                "EMERGENCY STOP"
        );
    }

    @Override
    public Telemetry telemetry() {

        return new Telemetry(
                state,
                position,
                batteryPercent,
                headingDegrees,
                groundSpeedMps
        );
    }

    private void validate(
            GeoPoint point
    ) {

        if (!geoFence.allows(point)) {

            throw new IllegalArgumentException(
                    "Waypoint rejected by geofence"
            );
        }

        if (batteryPercent < 20) {

            throw new IllegalStateException(
                    "Battery too low for mission"
            );
        }
    }

    private void drainBattery(
            double amount
    ) {

        batteryPercent =
                Math.max(
                        0,
                        batteryPercent - amount
                );
    }

    private double calculateHeading(
            GeoPoint from,
            GeoPoint to
    ) {

        double lat1 =
                Math.toRadians(
                        from.latitude()
                );

        double lat2 =
                Math.toRadians(
                        to.latitude()
                );

        double dLon =
                Math.toRadians(
                        to.longitude()
                        - from.longitude()
                );

        double y =
                Math.sin(dLon)
                * Math.cos(lat2);

        double x =
                Math.cos(lat1)
                * Math.sin(lat2)
                -
                Math.sin(lat1)
                * Math.cos(lat2)
                * Math.cos(dLon);

        double bearing =
                Math.toDegrees(
                        Math.atan2(y, x)
                );

        return (
                bearing + 360
        ) % 360;
    }

    private void requireState(
            UavState... allowed
    ) {

        for (UavState candidate : allowed) {

            if (state == candidate) {
                return;
            }
        }

        throw new IllegalStateException(
                "Invalid UAV state: "
                + state
        );
    }

    private void log(
            String message
    ) {

        System.out.println(
                "[ZYRA-UAV] "
                + message
        );
    }
}
