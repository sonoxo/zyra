package com.sonoxo.zyra.uav;

public interface UavController {

    void connect();

    void arm();

    void disarm();

    void takeoff(double altitudeMeters);

    void gotoPoint(GeoPoint point);

    void returnHome();

    void land();

    void emergencyStop();

    Telemetry telemetry();
}
