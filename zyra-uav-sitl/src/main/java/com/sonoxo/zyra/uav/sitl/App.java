package com.sonoxo.zyra.uav.sitl;

public class App {

    public static void main(
            String[] args
    ) throws Exception {

        SitlConfig config =
                SitlConfig.load();

        java.lang.System.out.println(
                "======================================"
        );

        java.lang.System.out.println(
                " ZYRA UAV MAVSDK SITL"
        );

        java.lang.System.out.println(
                "======================================"
        );

        java.lang.System.out.println(
                "HOST : "
                        + config.host()
        );

        java.lang.System.out.println(
                "PORT : "
                        + config.mavsdkPort()
        );

        ZyraSitlController zyra =
                new ZyraSitlController(
                        config
                );

        zyra.waitForConnection();

        zyra.printTelemetry();

        zyra.waitForHealth();

        zyra.setTakeoffAltitude(
                config.takeoffAltitudeMeters()
        );

        zyra.arm();

        zyra.takeoff();

        java.lang.System.out.println(
                "[ZYRA-UAV] AIRBORNE"
        );

        Thread.sleep(
                10000
        );

        zyra.returnToLaunch();

        java.lang.System.out.println(
                "[ZYRA-UAV] RTL ISSUED"
        );

        Thread.sleep(
                15000
        );

        java.lang.System.out.println(
                "======================================"
        );

        java.lang.System.out.println(
                " ZYRA SITL MISSION COMPLETE"
        );

        java.lang.System.out.println(
                "======================================"
        );
    }
}
