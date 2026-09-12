package com.sonoxo.zyra.uav.sitl;

import io.mavsdk.System;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class ZyraSitlController {

    private final System drone;

    public ZyraSitlController(
            SitlConfig config
    ) {

        this.drone =
                new System(
                        config.host(),
                        config.mavsdkPort()
                );
    }

    public void waitForConnection()
            throws InterruptedException {

        CountDownLatch latch =
                new CountDownLatch(1);

        drone.getCore()
                .getConnectionState()
                .subscribe(state -> {

                    java.lang.System.out.println(
                            "[ZYRA-UAV] connection="
                                    + state.getIsConnected()
                    );

                    if (state.getIsConnected()) {
                        latch.countDown();
                    }
                });

        if (!latch.await(
                30,
                TimeUnit.SECONDS
        )) {

            throw new IllegalStateException(
                    "SITL connection timeout"
            );
        }
    }

    public void waitForHealth()
            throws InterruptedException {

        CountDownLatch latch =
                new CountDownLatch(1);

        drone.getTelemetry()
                .getHealth()
                .subscribe(health -> {

                    boolean ready =
                            health.getIsGlobalPositionOk()
                            && health.getIsHomePositionOk();

                    java.lang.System.out.println(
                            "[ZYRA-UAV] health-ready="
                                    + ready
                    );

                    if (ready) {
                        latch.countDown();
                    }
                });

        if (!latch.await(
                60,
                TimeUnit.SECONDS
        )) {

            throw new IllegalStateException(
                    "SITL health timeout"
            );
        }
    }

    public void printTelemetry() {

        drone.getTelemetry()
                .getPosition()
                .subscribe(position -> {

                    java.lang.System.out.printf(
                            "[POSITION] lat=%.6f lon=%.6f relAlt=%.2fm%n",
                            position.getLatitudeDeg(),
                            position.getLongitudeDeg(),
                            position.getRelativeAltitudeM()
                    );
                });

        drone.getTelemetry()
                .getBattery()
                .subscribe(battery -> {

                    java.lang.System.out.printf(
                            "[BATTERY] %.1f%%%n",
                            battery.getRemainingPercent()
                                    * 100
                    );
                });
    }

    public void arm()
            throws InterruptedException {

        java.lang.System.out.println(
                "[ZYRA-UAV] ARM"
        );

        CountDownLatch latch =
                new CountDownLatch(1);

        drone.getAction()
                .arm()
                .subscribe(
                        latch::countDown,
                        error -> {
                            error.printStackTrace();
                            latch.countDown();
                        }
                );

        latch.await(
                15,
                TimeUnit.SECONDS
        );
    }

    public void setTakeoffAltitude(
            double meters
    ) throws InterruptedException {

        CountDownLatch latch =
                new CountDownLatch(1);

        drone.getAction()
                .setTakeoffAltitude(
                        (float) meters
                )
                .subscribe(
                        latch::countDown,
                        error -> {
                            error.printStackTrace();
                            latch.countDown();
                        }
                );

        latch.await(
                10,
                TimeUnit.SECONDS
        );
    }

    public void takeoff()
            throws InterruptedException {

        java.lang.System.out.println(
                "[ZYRA-UAV] TAKEOFF"
        );

        CountDownLatch latch =
                new CountDownLatch(1);

        drone.getAction()
                .takeoff()
                .subscribe(
                        latch::countDown,
                        error -> {
                            error.printStackTrace();
                            latch.countDown();
                        }
                );

        latch.await(
                15,
                TimeUnit.SECONDS
        );
    }

    public void land()
            throws InterruptedException {

        java.lang.System.out.println(
                "[ZYRA-UAV] LAND"
        );

        CountDownLatch latch =
                new CountDownLatch(1);

        drone.getAction()
                .land()
                .subscribe(
                        latch::countDown,
                        error -> {
                            error.printStackTrace();
                            latch.countDown();
                        }
                );

        latch.await(
                15,
                TimeUnit.SECONDS
        );
    }

    public void returnToLaunch()
            throws InterruptedException {

        java.lang.System.out.println(
                "[ZYRA-UAV] RTL"
        );

        CountDownLatch latch =
                new CountDownLatch(1);

        drone.getAction()
                .returnToLaunch()
                .subscribe(
                        latch::countDown,
                        error -> {
                            error.printStackTrace();
                            latch.countDown();
                        }
                );

        latch.await(
                15,
                TimeUnit.SECONDS
        );
    }
}
